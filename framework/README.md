# Agent Framework

A production-ready framework for building AI agents following the [12-factor principles](https://github.com/humanlayer/12-factor-agents).

## 🎉 What's New

### MCP (Model Context Protocol) Support ⚡ NEW!

Connect your agents to external MCP servers for extended capabilities:

```typescript
import { MCPManager, MCPToolExecutor } from 'twelve-factor-agent-framework';

const mcpManager = new MCPManager();

// Connect to MCP servers (local or remote)
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
});

// Get tools from MCP
const tools = mcpManager.getAllTools();

// Create agent with MCP tools
const agent = new Agent({
  tools,
  toolExecutors: [new MCPToolExecutor(mcpManager)],
  // ...
});
```

**Features:**
- 🔌 Connect to local (stdio) or remote (SSE) MCP servers
- 🛠️ Access tools from official MCP servers (filesystem, GitHub, PostgreSQL, etc.)
- 🔄 Support for multiple simultaneous MCP connections
- 🎨 Full UI support for configuring MCP servers

See [MCP_INTEGRATION.md](MCP_INTEGRATION.md) and [ui-client/MCP_QUICK_START.md](ui-client/MCP_QUICK_START.md) for complete documentation.

### Multi-Agent Composition

The framework supports **hierarchical agent composition** where agents can use other agents as tools:

```typescript
// Create specialists
const weatherAgent = new Agent({ /* weather tools */ });
const mathAgent = new Agent({ /* math tools */ });

// Convert to tools
const weatherTool = agentAsTool(weatherAgent, { streamToParent: true });
const mathTool = agentAsTool(mathAgent);

// Create coordinator
const coordinator = new Agent({
  name: 'Coordinator',
  tools: { weather: weatherTool, math: mathTool },
  // ...
});
```

See [MULTI_AGENT.md](MULTI_AGENT.md) for complete documentation and [examples/multi-agent.ts](examples/multi-agent.ts) for a working example.

## Core Principles

This framework is built around the 12-factor principles for AI agents:

1. **Natural Language to Tool Calls** - Convert natural language to structured tool calls
2. **Own Your Prompts** - Full control over prompt engineering
3. **Own Your Context Window** - Custom context formats optimized for your use case
4. **Tools are Structured Outputs** - Tools are just JSON that triggers deterministic code
5. **Unify Execution State** - Single source of truth for all state
6. **Launch/Pause/Resume** - Simple APIs for agent lifecycle management
7. **Contact Humans with Tools** - Human-in-the-loop as first-class citizens
8. **Own Your Control Flow** - Custom control structures for your use case
9. **Compact Errors** - Error handling and recovery in context
10. **Small, Focused Agents** - Composable, single-purpose agents
11. **Trigger from Anywhere** - Meet users where they are
12. **Stateless Reducer** - Agents as pure functions of state

## Features

- 🎯 **Framework Agnostic** - Use with any LLM provider (OpenAI Response API included)
- 🔄 **Streaming Support** - See reasoning in real-time
- 🛠️ **Type-Safe Tools** - Full TypeScript support for tool definitions
- 🔌 **MCP Support** - Connect to Model Context Protocol servers
- 🤖 **Multi-Agent Systems** - Compose agents hierarchically
- 🎭 **Custom Context** - Own your context window format
- ⏸️ **Pause/Resume** - Interrupt and resume agent execution
- 🧩 **Composable** - Build complex agents from simple primitives
- 📊 **Observable** - Built-in event tracking and debugging
- 🤖 **Multi-Agent** - Hierarchical agent composition (agents as tools)
- ⚡ **Inline Executors** - Simplified tool definition with inline `execute` methods

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Simple Agent with Inline Executors

```typescript
import { Agent, OpenAIConnector, ThreadManager, OpenAIContextBuilder } from 'agent-framework';

// Define tools with inline execute methods - no separate executors needed!
const tools = {
  search: {
    intent: 'search',
    description: 'Search for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    },
    execute: async (args) => {
      // Your tool logic here
      return { results: ['Result 1', 'Result 2'] };
    }
  }
};

// Create an agent
const agent = new Agent({
  name: 'SearchAgent',
  systemPrompt: 'You are a helpful search assistant.',
  tools,
  connector: new OpenAIConnector({ 
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  }),
  contextBuilder: new OpenAIContextBuilder()
});

// Run the agent
const thread = ThreadManager.create();
const result = await agent.streamRun(thread, 'What is TypeScript?');
console.log(result.message);
```

### Multi-Agent System

```typescript
import { agentAsTool } from 'agent-framework';

// Create specialized agents
const weatherAgent = new Agent({ /* ... */ });
const mathAgent = new Agent({ /* ... */ });

// Convert them to tools
const weatherTool = agentAsTool(weatherAgent, { streamToParent: true });
const mathTool = agentAsTool(mathAgent);

// Create a coordinator that uses sub-agents
const coordinator = new Agent({
  name: 'Coordinator',
  systemPrompt: 'You coordinate specialized sub-agents...',
  tools: {
    weather: weatherTool,
    math: mathTool
  },
  connector: new OpenAIConnector({ /* ... */ }),
  contextBuilder: new OpenAIContextBuilder()
});

// The coordinator will delegate to specialists as needed
const result = await coordinator.run(thread, 'What is the weather and what is 2+2?');
```

## Architecture

The framework consists of several core components:

### Event
The fundamental unit of state. Everything that happens is an event.

### Thread
A sequence of events representing the agent's execution history. This is your single source of truth.

### Tool
A structured output schema that the agent can generate. Tools trigger deterministic code.

### Agent
The core orchestrator that manages the agent loop: determine next step → execute → append result → repeat.

### Connector
An interface to LLM providers (OpenAI, Anthropic, etc.). Implements streaming and tool calling.

## Philosophy

This framework follows these key design principles:

- **Own Everything** - You control prompts, context, and flow
- **Events as State** - All state is derived from the event stream
- **Deterministic Tools** - Tool calls are just structured JSON that trigger your code
- **Pause Anywhere** - Break the loop at any point for human input or async operations
- **Composable Agents** - Build complex systems from simple, focused agents
- **No Magic** - Clear, explicit control flow you can understand and debug

## Documentation

- **[MULTI_AGENT.md](MULTI_AGENT.md)** - Complete multi-agent composition guide
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference for common patterns
- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual architecture documentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

## Examples

See the [examples](./examples) directory for complete examples:

- **`simple-agent.ts`** - Basic agent with inline tool executors
- **`multi-agent.ts`** - Hierarchical agent coordination with specialists
- **`ecommerce-multi-agent.ts`** - Enterprise-scale 3-level agent hierarchy (Sales, Logistics, Customer Service)

Run examples:
```bash
npm run example:simple      # Simple agent
npm run example:multi       # Multi-agent coordination
npm run example:ecommerce   # E-commerce enterprise system
```

## CLI Usage

```bash
# Run the interactive CLI
npm run cli chat

# Single query
npm run cli run "What is 2+2?"

# Or with tsx directly
tsx src/cli/index.ts chat
```

## License

Apache 2.0
