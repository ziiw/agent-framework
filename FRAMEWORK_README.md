# Agent Framework

A production-ready TypeScript framework for building AI agents following the [12-factor principles](https://github.com/humanlayer/12-factor-agents).

## 🎯 What Makes This Different

Unlike other agent frameworks, this one gives you **full control**:

- ✅ **Own Your Prompts** - No hidden prompt engineering
- ✅ **Own Your Context** - Custom context building for token efficiency  
- ✅ **Own Your Control Flow** - Pause anywhere, custom step handlers
- ✅ **Streaming with Reasoning** - See o-series models think in real-time
- ✅ **Events as State** - Single source of truth, easy serialization
- ✅ **Framework Agnostic** - Works with any LLM provider

## 🚀 Quick Start

```bash
cd framework
npm install
npm run build

# Set your OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Try the interactive CLI
npm run cli chat

# Or run an example
npm run example
```

## 📖 Documentation

- **[PROJECT_SUMMARY.md](./framework/PROJECT_SUMMARY.md)** - Complete overview
- **[QUICK_START.md](./framework/QUICK_START.md)** - Getting started guide
- **[GUIDE.md](./framework/GUIDE.md)** - Full API reference
- **[ARCHITECTURE.md](./framework/ARCHITECTURE.md)** - Design decisions

## 🏗️ Architecture

```typescript
// Everything is an event
thread = ThreadManager.addEvent(thread, 'user_message', { message: 'Hello' });

// Tools are just structured outputs
const tools = {
  search: {
    intent: 'search',
    description: 'Search for information',
    parameters: { /* JSON schema */ }
  }
};

// Agent orchestrates the loop
const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are helpful.',
  tools,
  connector: new OpenAIConnector({ apiKey: '...' }),
  toolExecutors: [...]
});

// Run with streaming
const result = await agent.streamRun(
  thread,
  'Do something',
  (chunk) => {
    if (chunk.type === 'reasoning') console.log('💭', chunk.content);
    if (chunk.type === 'content') console.log('💬', chunk.content);
  }
);
```

## 🎨 Features

### Core Features
- **Type-Safe** - Full TypeScript support with complete type definitions
- **Streaming** - Real-time responses with reasoning visibility (o-series models)
- **Pause/Resume** - Interrupt execution at any point and resume later
- **Serialization** - Save and restore threads as JSON
- **Compaction** - Manage context window size with thread compaction
- **Forking** - Create thread branches for exploration

### OpenAI Response API Integration
- ✅ Full support for the new Response API
- ✅ Streaming with server-sent events
- ✅ Reasoning tokens (o1, o3 models)
- ✅ Tool calling with structured outputs
- ✅ Background execution support

### Developer Experience
- 🎯 Interactive CLI for testing
- 📚 Complete examples and documentation
- 🔍 Observable - every event tracked
- 🐛 Easy debugging with event history
- 🧪 Testable - pure functions

## 📦 What's Included

```
framework/
├── src/                      # Framework source code
│   ├── types.ts              # Core type definitions
│   ├── thread.ts             # Thread management
│   ├── context.ts            # Context builders (3 implementations)
│   ├── agent.ts              # Core agent orchestrator
│   ├── connectors/
│   │   └── openai.ts         # OpenAI Response API connector
│   ├── utils/
│   │   └── tool-registry.ts  # Tool executor utilities
│   └── cli/
│       └── index.ts          # Interactive CLI
│
├── examples/                 # Working examples
│   ├── simple-agent.ts       # Basic usage
│   ├── human-in-loop.ts      # Pause for approval
│   ├── custom-context.ts     # Custom context building
│   └── error-handling.ts     # Error recovery
│
└── dist/                     # Compiled JavaScript
```

## 💡 Examples

### Basic Agent

```typescript
import { Agent, OpenAIConnector, ThreadManager, FunctionToolExecutor } from './src';

const agent = new Agent({
  name: 'MathAgent',
  systemPrompt: 'You are a helpful math assistant.',
  tools: {
    calculate: {
      intent: 'calculate',
      description: 'Perform a calculation',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression' }
        }
      }
    }
  },
  connector: new OpenAIConnector({ apiKey: process.env.OPENAI_API_KEY }),
  toolExecutors: [
    new FunctionToolExecutor('calculate', async (args) => {
      return { result: eval(args.expression) };
    })
  ]
});

const thread = ThreadManager.create();
const result = await agent.run(thread, 'What is 15 * 23?');
console.log(result.message);
```

### Human-in-the-Loop

```typescript
const agent = new Agent({
  name: 'EmailAgent',
  systemPrompt: 'You send emails.',
  tools: { send_email: { /* ... */ } },
  connector: new OpenAIConnector({ apiKey: '...' }),
  toolExecutors: [...],
  controlFlow: {
    pauseOnIntents: ['send_email']  // Pause before sending
  }
});

let result = await agent.run(thread, 'Send email to alice@example.com');

if (result.reason === 'paused') {
  // Show pending action to user
  const toolCall = ThreadManager.getLastEvent(result.thread, 'tool_call');
  console.log('Approve this?', toolCall.data);
  
  // If approved, resume
  thread = ThreadManager.addEvent(result.thread, 'approval', { approved: true });
  thread = ThreadManager.updateStatus(thread, 'active');
  result = await agent.resume(thread);
}
```

### With Streaming

```typescript
const result = await agent.streamRun(
  thread,
  'Calculate 15 * 23',
  (chunk) => {
    if (chunk.type === 'reasoning') {
      // o-series models show reasoning
      console.log('💭 Thinking:', chunk.content);
    } else if (chunk.type === 'content') {
      process.stdout.write(chunk.content || '');
    } else if (chunk.type === 'tool_call') {
      console.log('\n🔧 Calling:', chunk.toolCall?.intent);
    }
  }
);
```

## 🎯 12-Factor Principles

| Factor | Implementation |
|--------|---------------|
| **1. Natural Language → Tool Calls** | OpenAI Response API connector with structured outputs |
| **2. Own Your Prompts** | Direct systemPrompt configuration, no hidden prompts |
| **3. Own Your Context Window** | Custom ContextBuilder interface with 3 implementations |
| **4. Tools are Structured Outputs** | Tools are JSON schemas, not special abstractions |
| **5. Unify Execution State** | Thread as single source of truth |
| **6. Launch/Pause/Resume** | Simple run(), resume() APIs |
| **7. Contact Humans with Tools** | pauseOnIntents configuration |
| **8. Own Your Control Flow** | Custom onStep handlers |
| **9. Compact Errors** | ThreadManager.compact() for context management |
| **10. Small, Focused Agents** | Composable agent design |
| **11. Trigger from Anywhere** | Framework-agnostic thread creation |
| **12. Stateless Reducer** | Pure functions: Thread + Event = New Thread |

## 🎭 CLI Demo

```bash
# Interactive chat with streaming
npm run cli chat

Features:
- 🔄 Real-time streaming responses
- 💭 Reasoning visibility (o-series models)
- 🔧 Tool call tracking
- ⏸️ Pause/resume handling
- 🎨 Colored output with spinners

# Single query mode
npm run cli run "What is 2 + 2?"
```

## 🔧 Extending the Framework

### Add a New LLM Provider

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

### Custom Context Format

```typescript
class MyContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    return thread.events
      .map(e => `[${e.type}] ${JSON.stringify(e.data)}`)
      .join('\n');
  }
}
```

### Add Custom Tools

```typescript
new FunctionToolExecutor('my_tool', async (args) => {
  const result = await myAPI.call(args);
  return { data: result };
})
```

## 🚀 Production Ready

### Persistence
```typescript
const json = ThreadManager.serialize(thread);
await db.save(thread.id, json);

// Later...
const restored = ThreadManager.deserialize(await db.load(threadId));
await agent.resume(restored);
```

### Observability
```typescript
thread.events.forEach(event => {
  logger.info({ type: event.type, data: event.data });
});
```

### Error Handling
```typescript
if (result.reason === 'error') {
  await alerting.notify(result.error);
}
```

## 📚 Learn More

- [12-Factor Agents Principles](https://github.com/humanlayer/12-factor-agents)
- [OpenAI Response API Docs](https://platform.openai.com/docs/api-reference/responses)
- [Complete Guide](./framework/GUIDE.md)
- [Architecture Details](./framework/ARCHITECTURE.md)

## 🤝 Philosophy

This framework follows these principles:

1. **Simplicity** - Events + Thread = State
2. **Transparency** - No hidden abstractions
3. **Control** - You own everything
4. **Flexibility** - Extend at any point
5. **Production** - Built for real systems

The goal is to provide a **clear, understandable foundation** for building production AI agents following proven software engineering principles.

## 📄 License

Apache 2.0

---

Built with ❤️ following the 12-factor agent principles
