/**
 * Simple Agent Example
 * 
 * Demonstrates basic agent usage with inline tool executors
 */

import { Agent, OpenAIConnector, ThreadManager, OpenAIContextBuilder } from '../src';

async function main() {
  // Create an OpenAI connector
  const connector = new OpenAIConnector({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  });

  // Define tools with inline execute methods
  const tools = {
    weather: {
      intent: 'get_weather',
      description: 'Get weather information for a location',
      parameters: {
        type: 'object' as const,
        properties: {
          location: {
            type: 'string',
            description: 'City name or location'
          }
        },
        required: ['location']
      },
      execute: async (args: any) => {
        // Simulate API call
        return {
          location: args.location,
          temperature: 72,
          condition: 'Sunny',
          humidity: 45
        };
      }
    },
    calculate: {
      intent: 'calculate',
      description: 'Perform a calculation',
      parameters: {
        type: 'object' as const,
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression'
          }
        },
        required: ['expression']
      },
      execute: async (args: any) => {
        const result = eval(args.expression);
        return { result, expression: args.expression };
      }
    }
  };

  // Create agent (no separate toolExecutors needed!)
  const agent = new Agent({
    name: 'WeatherAgent',
    systemPrompt: `You are a helpful weather assistant.
You can get weather information and perform calculations.
Always be concise and helpful.`,
    tools,
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Create a thread
  const thread = ThreadManager.create();

  // Run the agent with streaming
  console.log('🤖 Running agent...\n');

  const result = await agent.streamRun(
    thread,
    'What is the weather in San Francisco? Also, what is 15 * 23?',
    (chunk) => {
      if (chunk.type === 'reasoning') {
        process.stdout.write('.');
      } else if (chunk.type === 'content') {
        process.stdout.write(chunk.content || '');
      } else if (chunk.type === 'tool_call' && chunk.toolCall) {
        console.log(`\n🔧 Calling tool: ${chunk.toolCall.intent}`);
      }
    }
  );

  console.log('\n\n✅ Agent completed!');
  console.log(`Status: ${result.reason}`);
  console.log(`Events: ${result.thread.events.length}`);

  // Display the thread
  console.log('\n📜 Thread History:');
  for (const event of result.thread.events) {
    console.log(`  [${event.type}] ${JSON.stringify(event.data).slice(0, 100)}...`);
  }
}

main().catch(console.error);
