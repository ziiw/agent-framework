/**
 * Error Handling Example
 * 
 * Demonstrates error recovery and compaction
 * Factor 9: Compact errors into context window
 */

import {
  Agent,
  OpenAIConnector,
  ThreadManager,
  FunctionToolExecutor,
  OpenAIContextBuilder
} from '../src';

async function main() {
  const connector = new OpenAIConnector({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  });

  const tools = {
    divide: {
      intent: 'divide',
      description: 'Divide two numbers',
      parameters: {
        type: 'object' as const,
        properties: {
          a: { type: 'number', description: 'Dividend' },
          b: { type: 'number', description: 'Divisor' }
        },
        required: ['a', 'b']
      }
    },
    fetch_data: {
      intent: 'fetch_data',
      description: 'Fetch data from an API',
      parameters: {
        type: 'object' as const,
        properties: {
          endpoint: { type: 'string' }
        },
        required: ['endpoint']
      }
    }
  };

  const toolExecutors = [
    new FunctionToolExecutor('divide', async (args) => {
      if (args.b === 0) {
        throw new Error('Cannot divide by zero');
      }
      return { result: args.a / args.b };
    }),
    new FunctionToolExecutor('fetch_data', async (args) => {
      // Simulate occasional failures
      if (Math.random() < 0.3) {
        throw new Error('Network timeout');
      }
      return { data: 'Sample data' };
    })
  ];

  const agent = new Agent({
    name: 'ErrorHandlingAgent',
    systemPrompt: `You are a helpful assistant.
When an error occurs, try to understand what went wrong and either:
1. Try a different approach
2. Explain the error to the user
3. Ask for clarification

Always be helpful and don't give up too easily.`,
    tools,
    connector,
    toolExecutors,
    contextBuilder: new OpenAIContextBuilder(),
    controlFlow: {
      maxIterations: 10
    }
  });

  let thread = ThreadManager.create();

  console.log('🤖 Testing error handling...\n');

  // Test 1: Division by zero
  console.log('Test 1: Division by zero');
  let result = await agent.run(thread, 'What is 10 divided by 0?');
  
  console.log(`Result: ${result.message}`);
  console.log(`Status: ${result.reason}`);
  console.log(`Events: ${result.thread.events.length}\n`);

  // Test 2: Thread compaction after many errors
  console.log('Test 2: Thread compaction');
  thread = ThreadManager.create();
  
  // Add many events
  for (let i = 0; i < 10; i++) {
    thread = ThreadManager.addEvent(thread, 'tool_result', {
      data: `Result ${i}`
    });
  }

  console.log(`Events before compaction: ${thread.events.length}`);
  
  // Compact thread (keep only last 5 events)
  thread = ThreadManager.compact(thread, { keepLast: 5 });
  
  console.log(`Events after compaction: ${thread.events.length}`);
  console.log(`Metadata: ${JSON.stringify(thread.metadata)}`);
}

main().catch(console.error);
