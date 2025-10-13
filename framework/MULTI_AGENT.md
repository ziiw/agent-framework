# Multi-Agent Composition

The Agent Framework now supports hierarchical agent composition, where agents can use other agents as tools. This enables powerful patterns like coordinator/specialist architectures, agent pipelines, and modular agent systems.

## Overview

Multi-agent composition follows the twelve-factor principles:

- **Factor 4 (Tools are Structured Outputs)**: Sub-agents are just tools that return structured data
- **Factor 5 (Unify Execution State)**: Each agent maintains its own thread
- **Factor 10 (Small Focused Agents)**: Encourages building specialized agents that compose well
- **Factor 7 (Contact Humans)**: Approval requests can bubble up through agent hierarchy

## Quick Start

### 1. Simplified Tool Definition

Tools now support inline `execute` methods, eliminating the need for separate `ToolExecutor` classes:

```typescript
const agent = new Agent({
  name: 'MyAgent',
  tools: {
    calculate: {
      intent: 'calculate',
      description: 'Perform calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string' }
        },
        required: ['expression']
      },
      execute: async (args: any) => {
        return { result: eval(args.expression) };
      }
    }
  },
  connector,
  contextBuilder: new OpenAIContextBuilder()
});
```

### 2. Converting Agents to Tools

Use `agentAsTool()` to convert any agent into a tool definition:

```typescript
import { agentAsTool } from 'agent-framework';

// Create a specialized agent
const weatherAgent = new Agent({
  name: 'WeatherSpecialist',
  systemPrompt: 'You are a weather expert...',
  tools: { /* weather tools */ },
  connector,
  contextBuilder: new OpenAIContextBuilder()
});

// Convert it to a tool
const weatherTool = agentAsTool(weatherAgent, {
  intent: 'ask_weather_specialist',
  description: 'Delegate weather questions to the specialist',
  streamToParent: true,  // Stream sub-agent output to parent
  maxTurns: 10,          // Limit sub-agent iterations
  bubbleApprovals: true  // Propagate pause requests to parent
});
```

### 3. Building a Coordinator Agent

Combine multiple specialist agents under a coordinator:

```typescript
const coordinatorAgent = new Agent({
  name: 'Coordinator',
  systemPrompt: `You manage specialized sub-agents.
  - Use ask_weather_specialist for weather questions
  - Use ask_math_specialist for calculations
  - Use ask_research_specialist for information gathering
  
  Delegate tasks to appropriate specialists and synthesize their responses.`,
  tools: {
    weather: weatherTool,
    math: mathTool,
    research: researchTool
  },
  connector,
  contextBuilder: new OpenAIContextBuilder()
});
```

### 4. Running Multi-Agent Systems

Sub-agents execute seamlessly as part of the parent agent's tool calls:

```typescript
const thread = ThreadManager.create();

const result = await coordinatorAgent.streamRun(
  thread,
  "What's the weather in Tokyo and convert 25°C to Fahrenheit?",
  (chunk) => {
    if (chunk.type === 'tool_call') {
      console.log(`Delegating to: ${chunk.toolCall?.intent}`);
    }
  }
);
```

## API Reference

### `agentAsTool(agent, options)`

Converts an agent into a tool definition.

**Parameters:**
- `agent: Agent` - The agent to convert
- `options: AgentAsToolOptions` - Configuration options

**Options:**
```typescript
interface AgentAsToolOptions {
  intent?: string;           // Custom intent name (default: use_{agent_name})
  description?: string;      // Custom description (default: from agent)
  parameters?: {             // Additional parameters beyond 'query'
    additionalProperties?: Record<string, any>;
  };
  maxTurns?: number;        // Max iterations for sub-agent (default: 10)
  streamToParent?: boolean; // Stream output to parent (default: false)
  bubbleApprovals?: boolean; // Propagate pause requests (default: true)
}
```

**Returns:** `ToolDefinition` with inline executor

### `createAgentHierarchy(subAgents)`

Helper to create multiple agent tools at once.

**Parameters:**
```typescript
subAgents: Array<{
  agent: Agent;
  options?: AgentAsToolOptions;
}>
```

**Returns:**
```typescript
{
  tools: Record<string, ToolDefinition>
}
```

**Example:**
```typescript
const { tools } = createAgentHierarchy([
  { agent: weatherAgent, options: { streamToParent: true } },
  { agent: mathAgent, options: { maxTurns: 5 } },
  { agent: researchAgent }
]);

const coordinator = new Agent({
  name: 'Coordinator',
  tools,
  ...
});
```

## Common Patterns

### 1. Specialist Pattern

Create focused agents for specific domains:

```typescript
// Specialists
const weatherSpecialist = new Agent({ /* weather tools */ });
const mathSpecialist = new Agent({ /* math tools */ });
const researchSpecialist = new Agent({ /* research tools */ });

// Coordinator
const coordinator = new Agent({
  tools: {
    weather: agentAsTool(weatherSpecialist),
    math: agentAsTool(mathSpecialist),
    research: agentAsTool(researchSpecialist)
  }
});
```

### 2. Pipeline Pattern

Chain agents sequentially:

```typescript
const dataExtractor = new Agent({ /* extraction tools */ });
const dataAnalyzer = new Agent({ /* analysis tools */ });
const reportGenerator = new Agent({ /* reporting tools */ });

// Pipeline coordinator
const pipeline = new Agent({
  systemPrompt: 'Process data in stages: extract → analyze → report',
  tools: {
    extract: agentAsTool(dataExtractor),
    analyze: agentAsTool(dataAnalyzer),
    report: agentAsTool(reportGenerator)
  }
});
```

### 3. Hierarchical Pattern

Multiple levels of agent delegation:

```typescript
// Level 3: Specialists
const weatherAgent = new Agent({ /* */ });
const newsAgent = new Agent({ /* */ });

// Level 2: Domain coordinators
const infoAgent = new Agent({
  tools: {
    weather: agentAsTool(weatherAgent),
    news: agentAsTool(newsAgent)
  }
});

const actionAgent = new Agent({ /* action tools */ });

// Level 1: Main coordinator
const mainAgent = new Agent({
  tools: {
    info: agentAsTool(infoAgent),
    action: agentAsTool(actionAgent)
  }
});
```

## Execution Context

Sub-agents receive an `ExecutionContext` with information about the parent:

```typescript
interface ExecutionContext {
  agentName?: string;        // Parent agent name
  threadId?: string;         // Parent thread ID
  userId?: string;           // User identifier
  sessionId?: string;        // Session identifier
  metadata?: Record<string, any>;
  onChunk?: (chunk: StreamChunk) => void; // Streaming callback
}
```

This context is passed to inline `execute` methods:

```typescript
{
  intent: 'custom_tool',
  execute: async (args, context) => {
    console.log(`Called by: ${context?.agentName}`);
    return { result: 'data' };
  }
}
```

## Sub-Agent Results

When a sub-agent completes, it returns structured data:

```typescript
{
  status: 'completed' | 'paused' | 'error' | 'max_iterations',
  message: string,           // Final message from sub-agent
  subThreadId: string,       // ID of sub-agent's thread
  reason: string,            // Completion reason
  metadata?: {
    turns: number,           // Number of turns executed
    toolsCalled: number,     // Number of tools called
    totalEvents: number      // Total events in sub-thread
  },
  error?: string,           // Error message if failed
  requiresApproval?: boolean // True if paused for approval
}
```

## Error Handling

Sub-agent errors are returned as structured data, not thrown:

```typescript
const result = await coordinatorAgent.run(thread, 'query');

// Check tool results for sub-agent errors
const toolResults = result.thread.events.filter(e => e.type === 'tool_result');
for (const result of toolResults) {
  if (result.data.status === 'error') {
    console.error(`Sub-agent error: ${result.data.error}`);
  }
}
```

## Best Practices

1. **Keep agents focused**: Each agent should have a clear, narrow purpose
2. **Use descriptive intents**: Make it clear what each sub-agent does
3. **Stream when needed**: Set `streamToParent: true` for real-time visibility
4. **Limit iterations**: Set `maxTurns` to prevent runaway sub-agents
5. **Handle pauses**: Decide whether to bubble approvals or fail
6. **Document dependencies**: Make agent relationships clear in system prompts
7. **Test independently**: Ensure each agent works alone before composing
8. **Monitor depth**: Avoid deep nesting (3 levels max recommended)

## Examples

See the complete examples:

- `examples/simple-agent.ts` - Basic inline executors
- `examples/multi-agent.ts` - Full multi-agent system with coordinator and specialists

Run them:

```bash
# Simple agent
npm run example:simple

# Multi-agent system
npm run example:multi
```

## Migration from Separate Executors

### Before (Separate Executors):

```typescript
const tools = {
  weather: {
    intent: 'get_weather',
    description: 'Get weather',
    parameters: { /* ... */ }
  }
};

const toolExecutors = [
  new FunctionToolExecutor('get_weather', async (args) => {
    return { /* data */ };
  })
];

const agent = new Agent({
  tools,
  toolExecutors,
  ...
});
```

### After (Inline Executors):

```typescript
const tools = {
  weather: {
    intent: 'get_weather',
    description: 'Get weather',
    parameters: { /* ... */ },
    execute: async (args) => {
      return { /* data */ };
    }
  }
};

const agent = new Agent({
  tools,
  ...
});
```

The old approach with separate `toolExecutors` is still supported for backward compatibility.

## Architecture Benefits

1. **Composability**: Build complex systems from simple agents
2. **Reusability**: Sub-agents can be used across multiple parents
3. **Isolation**: Each agent has its own thread and state
4. **Transparency**: Sub-agent calls visible in event stream
5. **Flexibility**: Swap or update sub-agents independently
6. **Testability**: Test each agent in isolation
7. **Scalability**: Distribute sub-agents across services (future)

## Future Enhancements

- Remote agent execution (agents as microservices)
- Agent discovery and registration
- Shared context between agents
- Agent-to-agent communication
- Dynamic agent selection based on capabilities
- Agent performance metrics and monitoring
