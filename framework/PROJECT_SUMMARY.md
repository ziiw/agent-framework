# Agent Framework - Summary

## What We Built

A **production-ready AI agent framework** built from scratch following the [12-factor agent principles](https://github.com/humanlayer/12-factor-agents).

## Key Features

✅ **OpenAI Response API Integration** with streaming support for reasoning visibility  
✅ **Full control** over prompts, context building, and control flow  
✅ **Type-safe** TypeScript implementation  
✅ **Interactive CLI** for testing and development  
✅ **Human-in-the-loop** support with pause/resume functionality  
✅ **Event-driven architecture** with single source of truth  
✅ **Completely framework-agnostic** - works with any LLM provider  

## Project Structure

```
framework/
├── src/
│   ├── types.ts              # Core type definitions
│   ├── thread.ts             # Thread management (state)
│   ├── context.ts            # Context builders (3 implementations)
│   ├── agent.ts              # Core agent orchestrator
│   ├── connectors/
│   │   └── openai.ts         # OpenAI Response API connector
│   ├── utils/
│   │   └── tool-registry.ts  # Tool executor utilities
│   ├── cli/
│   │   └── index.ts          # Interactive CLI
│   └── index.ts              # Main exports
│
├── examples/
│   ├── simple-agent.ts       # Basic agent with tools
│   ├── human-in-loop.ts      # Pause for approval
│   ├── custom-context.ts     # Custom context building
│   └── error-handling.ts     # Error recovery
│
├── README.md                 # Overview
├── GUIDE.md                  # Complete API documentation
├── QUICK_START.md            # Quick start guide
├── ARCHITECTURE.md           # Architecture details
└── package.json
```

## How the 12 Factors are Implemented

| Factor | Implementation | File |
|--------|---------------|------|
| **1. Natural Language to Tool Calls** | OpenAI Response API connector | `src/connectors/openai.ts` |
| **2. Own Your Prompts** | Direct systemPrompt in config | `src/agent.ts` |
| **3. Own Your Context Window** | Custom ContextBuilder interface | `src/context.ts` |
| **4. Tools are Structured Outputs** | ToolDefinition + ToolCall types | `src/types.ts` |
| **5. Unify Execution State** | Thread as single source of truth | `src/thread.ts` |
| **6. Launch/Pause/Resume** | run(), resume() methods | `src/agent.ts` |
| **7. Contact Humans with Tools** | pauseOnIntents config | `src/agent.ts` |
| **8. Own Your Control Flow** | onStep handler | `src/agent.ts` |
| **9. Compact Errors** | ThreadManager.compact() | `src/thread.ts` |
| **10. Small, Focused Agents** | Composable agent design | Framework design |
| **11. Trigger from Anywhere** | Framework-agnostic threads | `src/cli/index.ts` |
| **12. Stateless Reducer** | Pure functions in ThreadManager | `src/thread.ts` |

## Quick Start

```bash
cd framework
npm install
npm run build

# Set your OpenAI API key
cp .env.example .env
# Edit .env and add OPENAI_API_KEY

# Run the interactive CLI
npm run cli chat

# Or run an example
npm run example
```

## Core Concepts

### 1. Events
Everything that happens is an event. Events are immutable.

```typescript
const event = {
  id: 'evt_123',
  type: 'user_message',
  data: { message: 'Hello' },
  timestamp: Date.now()
};
```

### 2. Thread
A sequence of events. Your single source of truth.

```typescript
const thread = {
  id: 'thread_123',
  events: [event1, event2, event3],
  status: 'active',
  metadata: {}
};
```

### 3. Tools
JSON schemas that describe structured outputs.

```typescript
const tools = {
  search: {
    intent: 'search',
    description: 'Search for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      }
    }
  }
};
```

### 4. Agent
The orchestrator that runs the agent loop.

```typescript
const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are helpful.',
  tools,
  connector: new OpenAIConnector({ apiKey: '...' }),
  toolExecutors: [...]
});

const result = await agent.run(thread, 'Do something');
```

## Example Usage

### Basic Agent

```typescript
import { Agent, OpenAIConnector, ThreadManager, FunctionToolExecutor } from './src';

const agent = new Agent({
  name: 'WeatherAgent',
  systemPrompt: 'You are a weather assistant.',
  tools: {
    get_weather: {
      intent: 'get_weather',
      description: 'Get weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        }
      }
    }
  },
  connector: new OpenAIConnector({ apiKey: process.env.OPENAI_API_KEY }),
  toolExecutors: [
    new FunctionToolExecutor('get_weather', async (args) => {
      return { temp: 72, condition: 'Sunny' };
    })
  ]
});

const thread = ThreadManager.create();
const result = await agent.run(thread, 'What is the weather in SF?');
console.log(result.message);
```

### With Streaming

```typescript
const result = await agent.streamRun(
  thread,
  'Calculate 15 * 23',
  (chunk) => {
    if (chunk.type === 'reasoning') {
      console.log('Thinking:', chunk.content);
    } else if (chunk.type === 'content') {
      console.log('Response:', chunk.content);
    } else if (chunk.type === 'tool_call') {
      console.log('Tool:', chunk.toolCall?.intent);
    }
  }
);
```

### Human-in-the-Loop

```typescript
const agent = new Agent({
  // ...
  controlFlow: {
    pauseOnIntents: ['send_email']  // Pause before sending email
  }
});

let result = await agent.run(thread, 'Send email to alice');

if (result.reason === 'paused') {
  // Get approval from user
  const approved = await getUserApproval();
  
  if (approved) {
    // Add approval event and resume
    thread = ThreadManager.addEvent(result.thread, 'approval', { approved: true });
    thread = ThreadManager.updateStatus(thread, 'active');
    result = await agent.resume(thread);
  }
}
```

### Custom Context

```typescript
class MyContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    return thread.events
      .map(e => `[${e.type}] ${JSON.stringify(e.data)}`)
      .join('\n');
  }
}

const agent = new Agent({
  // ...
  contextBuilder: new MyContextBuilder()
});
```

## CLI Demo

The framework includes a full-featured CLI:

```bash
# Interactive chat mode
npm run cli chat

Features:
- 🔄 Real-time streaming responses
- 💭 Reasoning visibility (o-series models)
- 🔧 Tool call tracking
- ⏸️ Pause/resume handling
- 🎨 Colored output with progress indicators
```

## What Makes This Different

### vs. LangChain/LangGraph
- **No hidden abstractions** - You see exactly what's happening
- **No framework lock-in** - Just interfaces you implement
- **Full control** - You own prompts, context, and flow

### vs. Autogen/CrewAI
- **Simpler** - Events and threads, that's it
- **More control** - No magic agent coordination
- **Production-ready** - Easy to serialize, debug, and deploy

### vs. Building from Scratch
- **Best practices built-in** - 12-factor principles
- **OpenAI Response API integrated** - Including streaming
- **Extensible foundation** - Add your own connectors, builders, tools

## Extension Points

### Add New LLM Provider

```typescript
class AnthropicConnector implements LLMConnector {
  async determineNextStep(context, tools, options): Promise<LLMResponse> {
    // Call Anthropic API
  }
  
  async streamNextStep(context, tools, options, onChunk): Promise<LLMResponse> {
    // Stream from Anthropic
  }
}
```

### Add Custom Context Format

```typescript
class JSONContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): any[] {
    return thread.events.map(e => ({
      role: this.typeToRole(e.type),
      content: JSON.stringify(e.data)
    }));
  }
}
```

### Add Custom Tools

```typescript
const myExecutor = new FunctionToolExecutor('my_tool', async (args) => {
  const result = await myAPI.call(args);
  return { data: result };
});
```

## Testing

```typescript
import { ThreadManager } from './src/thread';

test('thread is immutable', () => {
  const thread = ThreadManager.create();
  const newThread = ThreadManager.addEvent(thread, 'test', { data: 'test' });
  
  expect(thread.events.length).toBe(0);
  expect(newThread.events.length).toBe(1);
});
```

## Production Deployment

### Persistence
```typescript
// Serialize
const json = ThreadManager.serialize(thread);
await db.save(json);

// Deserialize
const json = await db.load(threadId);
const thread = ThreadManager.deserialize(json);
const result = await agent.resume(thread);
```

### Observability
```typescript
thread.events.forEach(event => {
  logger.info({
    type: event.type,
    timestamp: event.timestamp,
    data: event.data
  });
});
```

### Error Handling
```typescript
if (result.reason === 'error') {
  await alerting.notify(result.error);
}
```

## Documentation

- **README.md** - Project overview
- **QUICK_START.md** - Getting started guide with usage patterns
- **GUIDE.md** - Complete API reference
- **ARCHITECTURE.md** - Design decisions and structure

## Next Steps

1. **Try the CLI**: `npm run cli chat`
2. **Run examples**: `npx tsx examples/simple-agent.ts`
3. **Read the guide**: See `GUIDE.md` for full API docs
4. **Build your agent**: Start with examples as templates
5. **Extend**: Add your own tools, contexts, or connectors

## Philosophy

This framework follows these principles:

1. **Simplicity** - Events + Thread = State
2. **Transparency** - No hidden abstractions
3. **Control** - You own everything
4. **Flexibility** - Extend at any point
5. **Production** - Built for real systems

The goal is to provide a **clear, understandable foundation** for building production AI agents that follows proven software engineering principles.

## Resources

- [12-Factor Agents](https://github.com/humanlayer/12-factor-agents) - The principles
- [OpenAI Response API](https://platform.openai.com/docs/api-reference/responses) - API docs
- [Examples](./examples) - Working code examples
- [Type Definitions](./src/types.ts) - Complete type reference

---

Built with ❤️ following the 12-factor agent principles
