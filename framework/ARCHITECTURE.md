# Agent Framework

## Project Structure

```
framework/
├── src/
│   ├── types.ts              # Core type definitions (Factor 5)
│   ├── thread.ts             # Thread management (Factor 12)
│   ├── context.ts            # Context builders (Factor 3)
│   ├── agent.ts              # Core agent orchestrator (Factor 8)
│   ├── connectors/
│   │   └── openai.ts         # OpenAI Response API connector (Factor 1)
│   ├── utils/
│   │   └── tool-registry.ts  # Tool executor utilities (Factor 4)
│   ├── cli/
│   │   └── index.ts          # Interactive CLI (Factor 11)
│   └── index.ts              # Main exports
│
├── examples/
│   ├── simple-agent.ts       # Basic usage
│   ├── human-in-loop.ts      # Factor 7: Human approval
│   ├── custom-context.ts     # Factor 3: Custom context
│   └── error-handling.ts     # Factor 9: Error compaction
│
├── dist/                     # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── README.md
├── GUIDE.md                  # Complete API documentation
├── QUICK_START.md            # Quick start guide
└── .env.example              # Environment template
```

## Framework Built on 12-Factor Principles

### ✅ Factor 1: Natural Language to Tool Calls
**Implementation**: `src/connectors/openai.ts`
- OpenAI Response API integration
- Converts natural language to structured tool calls
- Supports streaming for real-time reasoning

### ✅ Factor 2: Own Your Prompts
**Implementation**: `AgentConfig.systemPrompt`
- Direct system prompt in agent configuration
- No hidden prompt engineering
- Full control over every token

### ✅ Factor 3: Own Your Context Window
**Implementation**: `src/context.ts`
- `ContextBuilder` interface for custom formats
- `DefaultContextBuilder` - XML-like format
- `OpenAIContextBuilder` - Standard message format
- `CompactContextBuilder` - Token-optimized format

### ✅ Factor 4: Tools are Structured Outputs
**Implementation**: `src/types.ts` (ToolDefinition, ToolCall)
- Tools are JSON schemas
- Tool calls trigger deterministic code
- No special tool abstractions

### ✅ Factor 5: Unify Execution State
**Implementation**: `src/thread.ts`
- Thread contains all events
- No separate execution/business state
- Single source of truth

### ✅ Factor 6: Launch/Pause/Resume
**Implementation**: `src/agent.ts` (run, resume, streamRun)
- Simple API: `run()`, `resume()`
- Pause at any point
- Resume from serialized state

### ✅ Factor 7: Contact Humans with Tools
**Implementation**: `AgentConfig.controlFlow.pauseOnIntents`
- Configure which tools require approval
- Agent automatically pauses
- Resume after human response

### ✅ Factor 8: Own Your Control Flow
**Implementation**: `AgentConfig.controlFlow.onStep`
- Custom step handler
- Decide to continue, pause, or stop
- Full control over execution

### ✅ Factor 9: Compact Errors
**Implementation**: `ThreadManager.compact()`
- Remove old events
- Filter by type
- Keep context manageable

### ✅ Factor 10: Small, Focused Agents
**Implementation**: Composable agent design
- Each agent has a single purpose
- Easy to compose multiple agents
- No tight coupling

### ✅ Factor 11: Trigger from Anywhere
**Implementation**: Framework-agnostic thread creation
- CLI interface included
- Works with any trigger source
- Thread metadata tracks source

### ✅ Factor 12: Stateless Reducer
**Implementation**: `ThreadManager` pure functions
- Thread + Event = New Thread
- No side effects
- Immutable state transformations

## Key Design Decisions

### Events are Immutable
Events are never modified after creation. New events are appended to the thread.

### Thread is Serializable
Threads are plain objects that can be JSON serialized/deserialized for persistence.

### Context Building is Separate
Context building is a separate concern from agent execution, allowing full customization.

### Tools Don't Execute Themselves
Tool definitions describe structure. Tool executors handle execution. Clean separation.

### Streaming is First-Class
Streaming support built in from the start, not bolted on.

### No Hidden State
All state is in the thread. No globals, no hidden caches.

## Usage Flow

```
1. Create Connector
   ↓
2. Define Tools (schemas)
   ↓
3. Create Tool Executors (implementations)
   ↓
4. Configure Agent
   ↓
5. Create Thread
   ↓
6. Run Agent
   ↓
7. Agent Loop:
   - Build context from thread
   - Call LLM via connector
   - Handle response (tool call or message)
   - Execute tools if needed
   - Add events to thread
   - Check control flow
   - Continue or pause
   ↓
8. Return Result with final thread
```

## Extension Points

### Add New LLM Provider
Implement `LLMConnector` interface:
```typescript
class AnthropicConnector implements LLMConnector {
  async determineNextStep(...): Promise<LLMResponse>
  async streamNextStep(...): Promise<LLMResponse>
}
```

### Add Custom Context Format
Implement `ContextBuilder` interface:
```typescript
class MyContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string | any[]
}
```

### Add Custom Tools
Implement `ToolExecutor` interface:
```typescript
class MyToolExecutor implements ToolExecutor {
  canHandle(intent: string): boolean
  async execute(toolCall: ToolCall): Promise<ToolResult>
}
```

## Performance Considerations

### Context Window Size
- Use `ThreadManager.compact()` to limit event count
- Remove unnecessary event types
- Summarize old events

### Token Efficiency
- Custom context builders for optimal formatting
- Remove verbose data from events
- Use efficient serialization formats

### Streaming
- Use `streamRun()` for better UX
- Handle chunks asynchronously
- Don't block on streaming

### Parallelization
- Multiple agents can run independently
- Each agent operates on its own thread
- No shared state between agents

## Testing

```typescript
// Unit test example
import { ThreadManager } from './src/thread';

test('adding event creates new thread', () => {
  const thread = ThreadManager.create();
  const newThread = ThreadManager.addEvent(thread, 'test', { data: 'test' });
  
  expect(thread.events.length).toBe(0);
  expect(newThread.events.length).toBe(1);
  expect(newThread.events[0].type).toBe('test');
});
```

## Production Deployment

### Persistence
Serialize threads to database:
```typescript
const json = ThreadManager.serialize(thread);
await db.threads.save(thread.id, json);

// Later...
const json = await db.threads.load(threadId);
const thread = ThreadManager.deserialize(json);
```

### Observability
Thread events provide complete audit trail:
```typescript
thread.events.forEach(event => {
  logger.info({
    threadId: thread.id,
    eventType: event.type,
    eventId: event.id,
    timestamp: event.timestamp,
    data: event.data
  });
});
```

### Error Handling
Errors are events in the thread:
```typescript
if (result.reason === 'error') {
  const errorEvent = ThreadManager.getLastEvent(result.thread, 'error');
  await alerting.send({
    threadId: result.thread.id,
    error: errorEvent?.data.error
  });
}
```

## Next Steps

1. **Run Examples**: `npm run example` or `npx tsx examples/*.ts`
2. **Try CLI**: `npm run cli chat`
3. **Read Docs**: See `GUIDE.md` for complete API reference
4. **Build Your Agent**: Start with `examples/simple-agent.ts` as template
5. **Customize**: Add your own tools, context builders, or connectors

## Resources

- [12-Factor Agents](https://github.com/humanlayer/12-factor-agents) - Original principles
- [OpenAI Response API](https://platform.openai.com/docs/api-reference/responses) - API documentation
- [GUIDE.md](./GUIDE.md) - Complete framework documentation
- [QUICK_START.md](./QUICK_START.md) - Quick start guide

## Support

This is a reference implementation for educational purposes. Feel free to:
- Fork and modify for your needs
- Create issues for bugs or questions
- Submit PRs for improvements
- Share your agent implementations

The goal is to provide a clear, understandable foundation for production AI agents following the 12-factor principles.
