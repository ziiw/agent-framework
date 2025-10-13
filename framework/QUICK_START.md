# Agent Framework

## Quick Start

### 1. Setup

```bash
cd framework
npm install  # or bun install
npm run build
```

### 2. Set your OpenAI API key

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run the CLI

```bash
# Interactive chat
npm run cli chat

# Or run a single query
npm run cli run "What is 2 + 2?"
```

### 4. Run Examples

```bash
# Simple agent example
npm run example

# Other examples (run with tsx)
npx tsx examples/human-in-loop.ts
npx tsx examples/custom-context.ts
npx tsx examples/error-handling.ts
```

## What is This?

This is a production-ready framework for building AI agents following the [12-factor principles](https://github.com/humanlayer/12-factor-agents).

### Key Differentiators

Unlike other agent frameworks, this one gives you:

1. **Full Control** - Own your prompts, context, and control flow
2. **No Magic** - Clear, explicit code you can understand and debug
3. **Streaming with Reasoning** - See o-series models think in real-time
4. **Pause Anywhere** - Interrupt for human approval at any point
5. **Events as State** - Single source of truth, easy serialization
6. **Framework Agnostic** - Use with any LLM provider

## Core Philosophy

### Everything is an Event

```typescript
// User says something
thread = ThreadManager.addEvent(thread, 'user_message', { message: 'Hello' });

// Agent calls a tool
thread = ThreadManager.addEvent(thread, 'tool_call', { intent: 'search', arguments: {...} });

// Tool returns a result
thread = ThreadManager.addEvent(thread, 'tool_result', { data: {...} });
```

### Thread is Your Single Source of Truth

```typescript
// Your entire state is the thread
const thread: Thread = {
  id: 'thread_123',
  events: [...],
  status: 'active',
  metadata: {...}
};

// Serialize to JSON
const json = ThreadManager.serialize(thread);

// Resume from JSON later
const restored = ThreadManager.deserialize(json);
```

### Tools are Just Structured Outputs

```typescript
// Define what the tool looks like
const tools = {
  send_email: {
    intent: 'send_email',
    description: 'Send an email',
    parameters: { /* JSON schema */ }
  }
};

// The LLM outputs this
const toolCall = {
  intent: 'send_email',
  arguments: { to: 'alice@example.com', subject: 'Hello' }
};

// Your code decides what to do with it
if (toolCall.intent === 'send_email') {
  await sendEmail(toolCall.arguments);
}
```

## Architecture

```
User Input
    ↓
  Agent.run(thread, message)
    ↓
  Add user_message event to thread
    ↓
  ┌─────────────────────────┐
  │   AGENT LOOP            │
  │                         │
  │  1. Build Context       │ ← Your custom context builder
  │     from Thread         │
  │                         │
  │  2. Call LLM            │ ← OpenAI Response API
  │     (with streaming)    │
  │                         │
  │  3. Get Response        │
  │     - Tool call?        │ → Execute tool, add to thread, continue
  │     - Message?          │ → Add to thread, done
  │     - Done?             │ → Complete
  │                         │
  │  4. Check Control Flow  │ ← Your custom logic
  │     - Should pause?     │ → Pause and return
  │     - Should continue?  │ → Loop back to step 1
  │                         │
  └─────────────────────────┘
    ↓
  Return AgentResult with final thread
```

## 12-Factor Principles in Action

### Factor 1: Natural Language to Tool Calls

The `OpenAIConnector` converts natural language to structured tool calls:

```typescript
const connector = new OpenAIConnector({ apiKey: '...' });
const response = await connector.determineNextStep(context, tools);
// response.toolCall = { intent: 'search', arguments: { query: 'TypeScript' } }
```

### Factor 2: Own Your Prompts

You provide the exact system prompt:

```typescript
const agent = new Agent({
  systemPrompt: `You are a helpful assistant.
These are your exact instructions.
No hidden prompts.`,
  // ...
});
```

### Factor 3: Own Your Context Window

Custom context builders let you format context exactly how you want:

```typescript
class MyContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    // Format however you want!
    return thread.events
      .map(e => `[${e.type}] ${JSON.stringify(e.data)}`)
      .join('\n');
  }
}
```

### Factor 4: Tools are Structured Outputs

Tools are just JSON schemas. No special tool classes:

```typescript
const tools = {
  calculate: {
    intent: 'calculate',
    description: 'Do math',
    parameters: { type: 'object', properties: { expr: { type: 'string' } } }
  }
};
```

### Factor 5: Unify Execution State

Everything is in the thread:

```typescript
// No separate "execution context" or "memory"
// Just events in the thread
thread.events.forEach(event => {
  console.log(event.type, event.data);
});
```

### Factor 6: Launch/Pause/Resume

Simple APIs:

```typescript
// Launch
let result = await agent.run(thread, 'Do something');

// Pauses if configured
if (result.reason === 'paused') {
  // Approve, add event, resume
  result = await agent.resume(result.thread);
}
```

### Factor 7: Contact Humans with Tools

Human-in-the-loop via configuration:

```typescript
const agent = new Agent({
  // ...
  controlFlow: {
    pauseOnIntents: ['send_email', 'delete_data']
  }
});
```

### Factor 8: Own Your Control Flow

Custom step handlers:

```typescript
controlFlow: {
  onStep: async (event) => {
    if (shouldPause(event)) return 'pause';
    if (shouldStop(event)) return 'stop';
    return 'continue';
  }
}
```

### Factor 9: Compact Errors

Errors are events, easily compacted:

```typescript
// Error happens
thread = ThreadManager.addEvent(thread, 'error', { error: '...' });

// Later, compact old errors
thread = ThreadManager.compact(thread, {
  removeTypes: ['error'],
  keepLast: 20
});
```

### Factor 10: Small, Focused Agents

Build single-purpose agents and compose them:

```typescript
const searchAgent = new Agent({ name: 'Search', ... });
const emailAgent = new Agent({ name: 'Email', ... });

// Use them independently
const searchResult = await searchAgent.run(thread1, 'Search for...');
const emailResult = await emailAgent.run(thread2, 'Send email...');
```

### Factor 11: Trigger from Anywhere

The framework doesn't care how threads are created:

```typescript
// From CLI
const thread = ThreadManager.create({ source: 'cli' });

// From webhook
const thread = ThreadManager.create({ source: 'webhook', webhookId: '...' });

// From scheduled job
const thread = ThreadManager.create({ source: 'cron' });
```

### Factor 12: Stateless Reducer

Agents are pure functions:

```typescript
// Agent + Thread → New Thread
const newThread = ThreadManager.addEvent(thread, type, data);

// No side effects in the thread manager
// Just pure state transformations
```

## Usage Patterns

### Basic Usage

```typescript
import { Agent, OpenAIConnector, ThreadManager, FunctionToolExecutor } from './src';

const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are helpful.',
  tools: { /* ... */ },
  connector: new OpenAIConnector({ apiKey: '...' }),
  toolExecutors: [ /* ... */ ]
});

const thread = ThreadManager.create();
const result = await agent.run(thread, 'Do something');
```

### With Streaming

```typescript
const result = await agent.streamRun(
  thread,
  'Do something',
  (chunk) => {
    if (chunk.type === 'reasoning') {
      console.log('Thinking:', chunk.content);
    } else if (chunk.type === 'content') {
      console.log('Response:', chunk.content);
    }
  }
);
```

### With Human Approval

```typescript
let result = await agent.run(thread, 'Send email to alice');

if (result.reason === 'paused') {
  const approval = await askUserForApproval();
  if (approval) {
    thread = ThreadManager.addEvent(result.thread, 'approval', { approved: true });
    thread = ThreadManager.updateStatus(thread, 'active');
    result = await agent.resume(thread);
  }
}
```

### Custom Context

```typescript
class CustomBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    return `Custom format:\n${thread.events.map(e => e.type).join(', ')}`;
  }
}

const agent = new Agent({
  // ...
  contextBuilder: new CustomBuilder()
});
```

## Examples

### 1. Simple Agent (`examples/simple-agent.ts`)

Basic agent with weather and calculator tools.

### 2. Human-in-the-Loop (`examples/human-in-loop.ts`)

Agent that pauses before sending emails for human approval.

### 3. Custom Context (`examples/custom-context.ts`)

Shows how to build custom context formats for better token efficiency.

### 4. Error Handling (`examples/error-handling.ts`)

Demonstrates error recovery and thread compaction.

## CLI

The framework includes an interactive CLI:

```bash
# Interactive chat mode
npm run cli chat

# Single query mode
npm run cli run "What is the weather?"

# With specific model
npm run cli chat --model gpt-4o

# With API key
npm run cli chat --api-key sk-...
```

Features:
- 🔄 **Streaming** - See responses in real-time
- 💭 **Reasoning** - View o-series model reasoning
- 🔧 **Tool Calls** - See which tools are being called
- ⏸️ **Pause/Resume** - Handle paused states

## Extending the Framework

### Custom LLM Connector

```typescript
class MyConnector implements LLMConnector {
  async determineNextStep(context, tools, options): Promise<LLMResponse> {
    // Call your LLM API
    return { type: 'message', message: '...' };
  }
  
  async streamNextStep(context, tools, options, onChunk): Promise<LLMResponse> {
    // Stream from your LLM API
    return { type: 'message', message: '...' };
  }
}
```

### Custom Tool Executor

```typescript
class MyExecutor implements ToolExecutor {
  canHandle(intent: string): boolean {
    return intent === 'my_tool';
  }
  
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    // Execute the tool
    return { intent: toolCall.intent, data: {...} };
  }
}
```

## Best Practices

1. **Keep Tools Simple** - One tool = one clear action
2. **Use Descriptive Names** - Tool intents should be self-documenting
3. **Own Your Prompts** - Don't rely on framework defaults
4. **Compact Regularly** - Keep context windows manageable
5. **Log Everything** - The thread IS your log
6. **Test with Streaming** - See what the model is thinking
7. **Pause for Risky Actions** - Human approval for high-stakes operations

## Troubleshooting

### "Cannot find module 'openai'"

Run `npm install` or `bun install` in the framework directory.

### "OPENAI_API_KEY is not set"

Create a `.env` file from `.env.example` and add your API key.

### "Maximum iterations reached"

Increase `maxIterations` in agent config:

```typescript
controlFlow: {
  maxIterations: 50  // default is 20
}
```

### Streaming not working

Make sure you're using `streamRun()` not `run()`, and that your connector supports streaming.

## License

Apache 2.0

## Contributing

This is a reference implementation of the 12-factor agent principles. Feel free to:

- Add new connectors (Anthropic, Cohere, etc.)
- Create new context builders
- Build domain-specific tools
- Share your agent patterns

The goal is to provide a clear, understandable foundation for production AI agents.
