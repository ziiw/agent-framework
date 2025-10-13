# Multi-Agent Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Query                                │
│              "Weather in Tokyo? Convert 25°C to F?              │
│                  Research Tokyo's climate"                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Coordinator Agent                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ System Prompt: "You manage specialized sub-agents..."    │  │
│  │                                                           │  │
│  │ Tools:                                                    │  │
│  │  - ask_weather_specialist                                │  │
│  │  - ask_math_specialist                                   │  │
│  │  - ask_research_specialist                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Determines: Need weather specialist, math specialist, and       │
│             research specialist                                  │
└───────┬─────────────────┬─────────────────┬─────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────┐   ┌──────────────┐   ┌─────────────────┐
│  Weather    │   │    Math      │   │   Research      │
│ Specialist  │   │  Specialist  │   │   Specialist    │
├─────────────┤   ├──────────────┤   ├─────────────────┤
│ System:     │   │ System:      │   │ System:         │
│ "Weather    │   │ "Math        │   │ "Research       │
│  expert"    │   │  expert"     │   │  assistant"     │
│             │   │              │   │                 │
│ Tools:      │   │ Tools:       │   │ Tools:          │
│ get_weather │   │ calculate    │   │ search          │
│             │   │              │   │                 │
│ Thread 1    │   │ Thread 2     │   │ Thread 3        │
└─────┬───────┘   └──────┬───────┘   └────────┬────────┘
      │                  │                    │
      │ Returns:         │ Returns:           │ Returns:
      │ {temp: 25°C,     │ {result: 77°F}     │ {facts: [...]}
      │  condition:...}  │                    │
      │                  │                    │
      └──────────────────┴────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Coordinator Synthesizes Response                    │
│                                                                   │
│  "Tokyo is currently 25°C (77°F) with sunny conditions.         │
│   Tokyo has a humid subtropical climate with hot summers..."     │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow

```
Main Thread (Coordinator):
├─ [user_message] "Weather in Tokyo? Convert 25°C to F? Research climate"
├─ [tool_call] ask_weather_specialist { query: "What's weather in Tokyo?" }
│  └─ Sub-Thread 1 (Weather):
│     ├─ [user_message] "What's weather in Tokyo?"
│     ├─ [tool_call] get_weather { location: "Tokyo" }
│     ├─ [tool_result] { temp: 25°C, condition: "Sunny" }
│     └─ [assistant_message] "Tokyo is 25°C and sunny"
├─ [tool_result] { status: "completed", message: "Tokyo is 25°C...", ... }
├─ [tool_call] ask_math_specialist { query: "Convert 25°C to Fahrenheit" }
│  └─ Sub-Thread 2 (Math):
│     ├─ [user_message] "Convert 25°C to Fahrenheit"
│     ├─ [tool_call] calculate { expression: "25 * 9/5 + 32" }
│     ├─ [tool_result] { result: 77 }
│     └─ [assistant_message] "25°C equals 77°F"
├─ [tool_result] { status: "completed", message: "25°C equals 77°F", ... }
├─ [tool_call] ask_research_specialist { query: "Tokyo's climate facts" }
│  └─ Sub-Thread 3 (Research):
│     ├─ [user_message] "Tokyo's climate facts"
│     ├─ [tool_call] search { query: "Tokyo climate" }
│     ├─ [tool_result] { results: ["Humid subtropical...", ...] }
│     └─ [assistant_message] "Tokyo has humid subtropical climate..."
├─ [tool_result] { status: "completed", message: "Tokyo has...", ... }
└─ [assistant_message] "Tokyo is currently 25°C (77°F)..."
```

## Data Flow

```
┌──────────────┐
│ User Input   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Coordinator Agent                                 │
│ ┌──────────────────────────────────────────────┐ │
│ │ Context Builder                               │ │
│ │ - Builds context from main thread            │ │
│ │ - Sends to LLM                               │ │
│ └──────────────────────────────────────────────┘ │
│              │                                    │
│              ▼                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ LLM Connector                                 │ │
│ │ - Returns tool call: ask_weather_specialist  │ │
│ └──────────────────────────────────────────────┘ │
│              │                                    │
│              ▼                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Tool Executor (agentAsTool)                  │ │
│ │ ┌──────────────────────────────────────────┐ │ │
│ │ │ 1. Create sub-thread                     │ │ │
│ │ │ 2. Extract query from args               │ │ │
│ │ │ 3. Execute sub-agent                     │ │ │
│ │ │    ┌──────────────────────────────────┐  │ │ │
│ │ │    │ Weather Specialist Agent          │  │ │ │
│ │ │    │ - Has own context builder         │  │ │ │
│ │ │    │ - Has own LLM connector           │  │ │ │
│ │ │    │ - Has own tools (get_weather)     │  │ │ │
│ │ │    │ - Runs in sub-thread              │  │ │ │
│ │ │    └──────────────────────────────────┘  │ │ │
│ │ │ 4. Collect result                        │ │ │
│ │ │ 5. Return structured data                │ │ │
│ │ └──────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────┘ │
│              │                                    │
│              ▼                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Tool Result added to thread                  │ │
│ │ {                                            │ │
│ │   status: "completed",                       │ │
│ │   message: "Tokyo is 25°C...",              │ │
│ │   subThreadId: "thread-123",                │ │
│ │   metadata: { turns: 2, toolsCalled: 1 }    │ │
│ │ }                                            │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│ Final Answer │
└──────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Class                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Tools      │  │ Executor    │  │ Context Builder      │ │
│  │ (Defs)     │  │ Map         │  │                      │ │
│  └────────────┘  └─────────────┘  └──────────────────────┘ │
│         │              │                    │               │
│         └──────────────┴────────────────────┘               │
│                        │                                    │
│                        ▼                                    │
│              ┌──────────────────┐                          │
│              │ Tool Execution   │                          │
│              │ (with context)   │                          │
│              └──────────────────┘                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 agentAsTool Utility                          │
│  Takes: Agent + Options                                      │
│  Returns: ToolDefinition with execute()                      │
│                                                              │
│  execute() {                                                 │
│    1. Create sub-thread                                      │
│    2. Run sub-agent (streamRun or run)                       │
│    3. Handle pause/error/success                             │
│    4. Return structured result                               │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Thread Hierarchy                           │
│                                                              │
│  Main Thread (Coordinator)                                   │
│  ├─ Sub-Thread 1 (Weather Specialist)                       │
│  ├─ Sub-Thread 2 (Math Specialist)                          │
│  └─ Sub-Thread 3 (Research Specialist)                      │
│                                                              │
│  Each thread is independent with own events                  │
│  Sub-threads linked via metadata.parentThreadId              │
└─────────────────────────────────────────────────────────────┘
```

## Execution States

```
Sub-Agent Execution States:

┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌──────────────┐
│  RUNNING     │◄─────┐
└────┬─────────┘      │
     │                │
     ├─ Tool Call ────┘
     │
     ├──► ┌──────────────┐
     │    │  COMPLETED   │ ──► Return { status: "completed" }
     │    └──────────────┘
     │
     ├──► ┌──────────────┐
     │    │   PAUSED     │ ──► Return { status: "paused", 
     │    └──────────────┘          requiresApproval: true }
     │
     ├──► ┌──────────────┐
     │    │    ERROR     │ ──► Return { status: "error",
     │    └──────────────┘          error: "..." }
     │
     └──► ┌──────────────┐
          │ MAX_ITERS    │ ──► Return { status: "max_iterations",
          └──────────────┘          partialResult: true }
```

## Key Design Decisions

1. **Sub-threads are isolated**: Each sub-agent gets its own thread
2. **Structured results**: Sub-agents always return structured data, never throw
3. **Context propagation**: Parent agent info passed via ExecutionContext
4. **Streaming optional**: Sub-agents can stream to parent via onChunk callback
5. **Approval bubbling**: Pause requests can propagate up the hierarchy
6. **Thread metadata**: Links parent and child threads for traceability
