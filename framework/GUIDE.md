# Agent Framework - Complete Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Getting Started](#getting-started)
5. [Advanced Usage](#advanced-usage)
6. [12-Factor Principles](#12-factor-principles)
7. [API Reference](#api-reference)

## Introduction

The Agent Framework is a production-ready framework for building AI agents that follows the [12-factor principles](https://github.com/humanlayer/12-factor-agents). It provides a clear, explicit approach to agent development with full control over prompts, context, and execution flow.

### Key Features

- **Full Control**: Own your prompts, context building, and control flow
- **Type-Safe**: Full TypeScript support
- **Streaming**: Real-time reasoning visibility (o-series models)
- **Pausable**: Interrupt and resume agent execution anywhere
- **Composable**: Build complex agents from simple primitives
- **Observable**: Complete execution history as events

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│                    Agent                         │
│  (Orchestrates the execution loop)               │
└──────────────┬──────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
   ┌────▼────┐   ┌───▼────┐
   │ Thread  │   │ Tools  │
   │ (State) │   │        │
   └────┬────┘   └───┬────┘
        │            │
   ┌────▼────────────▼────┐
   │   LLM Connector       │
   │  (OpenAI, etc.)       │
   └───────────────────────┘
```

### Data Flow

1. **Input** → Add user message to Thread
2. **Context Building** → Convert Thread to context string/messages
3. **LLM Call** → Determine next step (tool call or message)
4. **Execution** → Execute tool if needed, add result to Thread
5. **Loop** → Repeat until done, paused, or max iterations

## Core Concepts

### 1. Events

Everything is an event. Events are immutable records of what happened.

```typescript
interface Event {
  id: string;
  type: string;  // 'user_message', 'tool_call', 'tool_result', etc.
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

### 2. Thread

A Thread is a sequence of events. It's your single source of truth.

```typescript
interface Thread {
  id: string;
  events: Event[];
  status: 'active' | 'paused' | 'completed' | 'error';
  metadata?: Record<string, any>;
}
```

**Factor 5**: Execution state and business state are unified in the Thread.

### 3. Tools

Tools are just structured outputs from the LLM that trigger deterministic code.

```typescript
interface ToolDefinition {
  intent: string;
  description: string;
  parameters: { /* JSON schema */ };
}
```

**Factor 4**: Tools are structured outputs, not special abstractions.

### 4. Context Builders

Control how your thread is converted into LLM input.

```typescript
interface ContextBuilder {
  buildContext(thread: Thread): string | any[];
}
```

**Factor 3**: Own your context window - you decide the format.

### 5. Agent

The orchestrator that runs the agent loop.

```typescript
class Agent {
  async run(thread: Thread, message: string): Promise<AgentResult>
  async resume(thread: Thread): Promise<AgentResult>
  async streamRun(thread: Thread, message: string, onChunk?: StreamCallback): Promise<AgentResult>
}
```

**Factor 8**: You own the control flow.

## Getting Started

### Installation

```bash
cd framework
npm install
```

### Basic Example

```typescript
import { 
  Agent, 
  OpenAIConnector, 
  ThreadManager,
  FunctionToolExecutor 
} from 'twelve-factor-agent-framework';

// 1. Create a connector
const connector = new OpenAIConnector({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});

// 2. Define tools
const tools = {
  calculate: {
    intent: 'calculate',
    description: 'Perform a calculation',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' }
      },
      required: ['expression']
    }
  }
};

// 3. Create tool executors
const toolExecutors = [
  new FunctionToolExecutor('calculate', async (args) => {
    return { result: eval(args.expression) };
  })
];

// 4. Create agent
const agent = new Agent({
  name: 'MathAgent',
  systemPrompt: 'You are a helpful math assistant.',
  tools,
  connector,
  toolExecutors
});

// 5. Run agent
const thread = ThreadManager.create();
const result = await agent.run(thread, 'What is 2 + 2?');

console.log(result.message); // "The result is 4"
```

### Streaming Example

```typescript
const result = await agent.streamRun(
  thread,
  'Calculate 15 * 23',
  (chunk) => {
    if (chunk.type === 'reasoning') {
      // o-series models show reasoning
      process.stdout.write('.');
    } else if (chunk.type === 'content') {
      process.stdout.write(chunk.content || '');
    } else if (chunk.type === 'tool_call') {
      console.log(`\nCalling: ${chunk.toolCall?.intent}`);
    }
  }
);
```

## Advanced Usage

### Human-in-the-Loop (Factor 7)

Pause execution for human approval:

```typescript
const agent = new Agent({
  name: 'EmailAgent',
  systemPrompt: 'You send emails.',
  tools: { send_email: { /* ... */ } },
  connector,
  toolExecutors,
  controlFlow: {
    // Pause before executing send_email
    pauseOnIntents: ['send_email']
  }
});

let result = await agent.run(thread, 'Send email to alice@example.com');

if (result.reason === 'paused') {
  // Get the pending tool call
  const toolCall = ThreadManager.getLastEvent(result.thread, 'tool_call');
  
  // Show to user for approval
  console.log('Approve this action?', toolCall.data);
  
  // If approved, add approval event and resume
  thread = ThreadManager.addEvent(result.thread, 'human_response', {
    approved: true
  });
  thread = ThreadManager.updateStatus(thread, 'active');
  
  result = await agent.resume(thread);
}
```

### Custom Context Building (Factor 3)

Create your own context format:

```typescript
class CustomContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    const parts = [];
    
    for (const event of thread.events) {
      if (event.type === 'user_message') {
        parts.push(`USER: ${event.data.message}`);
      } else if (event.type === 'tool_result') {
        parts.push(`RESULT: ${JSON.stringify(event.data.data)}`);
      }
    }
    
    return parts.join('\n\n') + '\n\nWhat next?';
  }
}

const agent = new Agent({
  // ...
  contextBuilder: new CustomContextBuilder()
});
```

### Error Handling (Factor 9)

Errors are just events in the thread:

```typescript
const toolExecutors = [
  new FunctionToolExecutor('risky_operation', async (args) => {
    try {
      return await performOperation(args);
    } catch (error) {
      // Error will be added to thread automatically
      throw error;
    }
  })
];

// The agent will see the error in context and can recover
const result = await agent.run(thread, 'Do the risky operation');
```

### Thread Compaction

Keep your context window manageable:

```typescript
// Keep only last 20 events
thread = ThreadManager.compact(thread, {
  keepLast: 20
});

// Remove specific event types
thread = ThreadManager.compact(thread, {
  removeTypes: ['debug', 'internal_state']
});
```

### Thread Forking

Create branches for exploration:

```typescript
// Fork the thread at a specific point
const alternativeThread = ThreadManager.fork(thread, beforeEventId);

// Try different approaches
const result1 = await agent.resume(thread);
const result2 = await agent.resume(alternativeThread);
```

## 12-Factor Principles

### Factor 1: Natural Language to Tool Calls

The framework converts natural language to structured tool calls via the LLM connector.

### Factor 2: Own Your Prompts

You provide the exact system prompt. No hidden prompt engineering.

```typescript
const agent = new Agent({
  systemPrompt: `Your exact instructions here.
You control every token.`
});
```

### Factor 3: Own Your Context Window

Custom context builders let you format context exactly how you want.

### Factor 4: Tools are Structured Outputs

Tools are JSON schemas. Tool calls are structured output that trigger your code.

### Factor 5: Unify Execution State

Everything is in the Thread. No separate execution state to manage.

### Factor 6: Launch/Pause/Resume

Simple APIs: `run()`, `resume()`. Pause anywhere, resume later.

### Factor 7: Contact Humans with Tools

Human-in-the-loop via `pauseOnIntents` configuration.

### Factor 8: Own Your Control Flow

Custom `onStep` handlers give you full control over execution flow.

```typescript
controlFlow: {
  onStep: async (event) => {
    if (event.type === 'tool_call' && isRisky(event.data)) {
      return 'pause';
    }
    return 'continue';
  }
}
```

### Factor 9: Compact Errors

Errors are events. Use `ThreadManager.compact()` to manage context size.

### Factor 10: Small, Focused Agents

Build single-purpose agents and compose them.

### Factor 11: Trigger from Anywhere

The framework doesn't care how threads are created. CLI, API, webhook, etc.

### Factor 12: Stateless Reducer

Agent + Thread → New Thread. Pure function.

```typescript
const newThread = ThreadManager.addEvent(thread, type, data);
```

## API Reference

### Agent

```typescript
class Agent {
  constructor(config: AgentConfig)
  
  async run(thread: Thread, message: string): Promise<AgentResult>
  async resume(thread: Thread): Promise<AgentResult>
  async streamRun(thread: Thread, message: string, onChunk?: StreamCallback): Promise<AgentResult>
  async streamResume(thread: Thread, onChunk?: StreamCallback): Promise<AgentResult>
  
  getName(): string
  getTools(): Record<string, ToolDefinition>
}
```

### ThreadManager

```typescript
class ThreadManager {
  static create(metadata?: Record<string, any>): Thread
  static addEvent<T>(thread: Thread, type: string, data: T, metadata?: any): Thread
  static getEventsByType(thread: Thread, type: string): Event[]
  static getLastEvent(thread: Thread, type?: string): Event | undefined
  static updateStatus(thread: Thread, status: Thread['status']): Thread
  static serialize(thread: Thread): string
  static deserialize(json: string): Thread
  static fork(thread: Thread, beforeEventId?: string): Thread
  static compact(thread: Thread, options?: CompactOptions): Thread
}
```

### OpenAIConnector

```typescript
class OpenAIConnector implements LLMConnector {
  constructor(options: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  })
  
  async determineNextStep(context, tools, options?): Promise<LLMResponse>
  async streamNextStep(context, tools, options?, onChunk?): Promise<LLMResponse>
}
```

### FunctionToolExecutor

```typescript
class FunctionToolExecutor implements ToolExecutor {
  constructor(intent: string, fn: (args: any) => Promise<any>)
  
  canHandle(intent: string): boolean
  async execute(toolCall: ToolCall): Promise<ToolResult>
}
```

## Examples

See the `examples/` directory for complete working examples:

- `simple-agent.ts` - Basic agent with tools
- `human-in-loop.ts` - Pause for human approval
- `custom-context.ts` - Custom context building
- `error-handling.ts` - Error recovery and compaction

## CLI Usage

The framework includes an interactive CLI:

```bash
# Interactive chat
npm run cli chat

# Single query
npm run cli run "What is 2 + 2?"

# With specific model
npm run cli chat --model gpt-4o

# With API key
npm run cli chat --api-key sk-...
```

## Contributing

This framework is designed to be extended. Key extension points:

- **Context Builders**: Implement `ContextBuilder` interface
- **Tool Executors**: Implement `ToolExecutor` interface  
- **LLM Connectors**: Implement `LLMConnector` interface

## License

Apache 2.0
