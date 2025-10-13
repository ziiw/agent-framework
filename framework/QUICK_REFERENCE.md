# Multi-Agent Quick Reference

## Creating an Agent with Inline Executors

```typescript
import { Agent, OpenAIConnector, OpenAIContextBuilder } from 'agent-framework';

const agent = new Agent({
  name: 'MyAgent',
  systemPrompt: 'You are a helpful assistant',
  tools: {
    my_tool: {
      intent: 'my_tool',
      description: 'Does something useful',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      },
      execute: async (args, context) => {
        return { result: `Processed: ${args.input}` };
      }
    }
  },
  connector: new OpenAIConnector({ apiKey: '...', model: 'gpt-4o' }),
  contextBuilder: new OpenAIContextBuilder()
});
```

## Converting Agent to Tool

```typescript
import { agentAsTool } from 'agent-framework';

const subAgentTool = agentAsTool(subAgent, {
  intent: 'use_sub_agent',           // Optional: custom intent
  description: 'Description',        // Optional: custom description
  streamToParent: true,              // Optional: stream to parent
  maxTurns: 10,                      // Optional: limit iterations
  bubbleApprovals: true              // Optional: propagate pauses
});
```

## Building Multi-Agent System

```typescript
// 1. Create specialists
const weatherAgent = new Agent({ /* ... */ });
const mathAgent = new Agent({ /* ... */ });

// 2. Convert to tools
const weatherTool = agentAsTool(weatherAgent);
const mathTool = agentAsTool(mathAgent);

// 3. Create coordinator
const coordinator = new Agent({
  name: 'Coordinator',
  systemPrompt: 'You manage specialists...',
  tools: {
    weather: weatherTool,
    math: mathTool
  },
  connector: new OpenAIConnector({ /* ... */ }),
  contextBuilder: new OpenAIContextBuilder()
});

// 4. Run
const thread = ThreadManager.create();
const result = await coordinator.streamRun(thread, 'Your query here');
```

## Using createAgentHierarchy

```typescript
import { createAgentHierarchy } from 'agent-framework';

const { tools } = createAgentHierarchy([
  { agent: weatherAgent, options: { streamToParent: true } },
  { agent: mathAgent, options: { maxTurns: 5 } },
  { agent: researchAgent }
]);

const coordinator = new Agent({
  name: 'Coordinator',
  tools,
  /* ... */
});
```

## Accessing Execution Context

```typescript
const tool = {
  intent: 'my_tool',
  execute: async (args, context) => {
    console.log('Called by:', context?.agentName);
    console.log('Thread ID:', context?.threadId);
    console.log('Metadata:', context?.metadata);
    
    // Stream to parent if available
    if (context?.onChunk) {
      context.onChunk({ type: 'content', content: 'Processing...' });
    }
    
    return { result: 'done' };
  }
};
```

## Sub-Agent Result Structure

```typescript
{
  status: 'completed' | 'paused' | 'error' | 'max_iterations',
  message: string,
  subThreadId: string,
  reason: string,
  metadata?: {
    turns: number,
    toolsCalled: number,
    totalEvents: number
  },
  error?: string,
  requiresApproval?: boolean
}
```

## Error Handling

```typescript
const result = await coordinator.run(thread, query);

// Check for errors in tool results
const toolResults = result.thread.events.filter(e => e.type === 'tool_result');
for (const tr of toolResults) {
  if (tr.data.status === 'error') {
    console.error('Sub-agent error:', tr.data.error);
  }
}
```

## Streaming Example

```typescript
await coordinator.streamRun(thread, query, (chunk) => {
  switch (chunk.type) {
    case 'reasoning':
      process.stdout.write('.');
      break;
    case 'content':
      process.stdout.write(chunk.content || '');
      break;
    case 'tool_call':
      console.log(`\n🔧 Calling: ${chunk.toolCall?.intent}`);
      break;
  }
});
```

## Common Patterns Cheat Sheet

### Specialist Pattern
```typescript
const specialist = new Agent({ /* focused domain */ });
const coordinator = new Agent({
  tools: { specialist: agentAsTool(specialist) }
});
```

### Pipeline Pattern
```typescript
const step1 = agentAsTool(agent1);
const step2 = agentAsTool(agent2);
const pipeline = new Agent({
  systemPrompt: 'Process in stages: step1 → step2',
  tools: { step1, step2 }
});
```

### Hierarchical Pattern
```typescript
const specialist = new Agent({ /* ... */ });
const domainCoord = new Agent({
  tools: { spec: agentAsTool(specialist) }
});
const mainCoord = new Agent({
  tools: { domain: agentAsTool(domainCoord) }
});
```

## Best Practices

✅ **DO:**
- Keep agents focused on specific domains
- Use descriptive intent names
- Set `maxTurns` to prevent runaway execution
- Test each agent independently first
- Stream when you need real-time visibility
- Limit nesting depth (3 levels max)

❌ **DON'T:**
- Create overly generic agents
- Nest too deeply (performance/cost impact)
- Forget to handle pause/error states
- Skip independent agent testing
- Create circular dependencies

## AgentAsToolOptions Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `intent` | `string` | `use_{agent_name}` | Custom intent name |
| `description` | `string` | From agent | Tool description |
| `parameters` | `object` | `{ query: string }` | Additional params |
| `maxTurns` | `number` | `10` | Max sub-agent iterations |
| `streamToParent` | `boolean` | `false` | Stream to parent callback |
| `bubbleApprovals` | `boolean` | `true` | Propagate pause requests |

## ExecutionContext Properties

| Property | Type | Description |
|----------|------|-------------|
| `agentName` | `string?` | Parent agent name |
| `threadId` | `string?` | Parent thread ID |
| `userId` | `string?` | User identifier |
| `sessionId` | `string?` | Session identifier |
| `metadata` | `object?` | Additional data |
| `onChunk` | `function?` | Streaming callback |

## CLI Usage

```bash
# Run simple agent example
npm run example:simple

# Run multi-agent example
npm run example:multi

# Interactive chat with inline executors
npm run cli chat

# Single query
npm run cli run "What is 2+2?"
```

## Environment Setup

```bash
# Required
export OPENAI_API_KEY="sk-..."

# Optional
export OPENAI_MODEL="gpt-4o"
```

## Migration Checklist

Moving from separate executors to inline:

- [ ] Add `execute` method to each tool definition
- [ ] Move logic from `FunctionToolExecutor` to `execute`
- [ ] Remove `toolExecutors` array from agent config
- [ ] Update imports (remove `FunctionToolExecutor`)
- [ ] Test each tool independently
- [ ] Test full agent workflow

## Troubleshooting

**Problem:** Tool not executing
- Check: Tool has `execute` method defined
- Check: Intent matches between tool def and calls
- Check: No syntax errors in execute function

**Problem:** Sub-agent not streaming
- Check: `streamToParent: true` in options
- Check: Parent passed `onChunk` callback
- Check: Using `streamRun` not `run`

**Problem:** Sub-agent never completes
- Check: `maxTurns` setting (increase if needed)
- Check: Sub-agent has tools it needs
- Check: LLM is returning proper completions

**Problem:** Errors not showing
- Check: Tool results in thread events
- Check: Error handling in execute methods
- Check: Sub-agent result structure

## Further Reading

- `MULTI_AGENT.md` - Full documentation
- `ARCHITECTURE_DIAGRAMS.md` - Visual architecture
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `examples/multi-agent.ts` - Complete working example
