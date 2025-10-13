/**
 * Custom Context Example
 * 
 * Demonstrates custom context building
 * Factor 3: Own your context window
 */

import {
  Agent,
  OpenAIConnector,
  ThreadManager,
  FunctionToolExecutor,
  ContextBuilder,
  Thread
} from '../src';

/**
 * Custom context builder that creates a narrative format
 */
class NarrativeContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    const parts: string[] = [];
    
    parts.push('# Agent Execution Log\n');
    parts.push(`Thread ID: ${thread.id}`);
    parts.push(`Status: ${thread.status}`);
    parts.push(`\n## Events\n`);

    for (const event of thread.events) {
      switch (event.type) {
        case 'user_message':
          parts.push(`**User said:** "${event.data.message}"\n`);
          break;
        case 'tool_call':
          parts.push(`**Agent decided to:** ${event.data.intent}`);
          parts.push(`**With arguments:** ${JSON.stringify(event.data.arguments)}\n`);
          break;
        case 'tool_result':
          parts.push(`**Tool returned:** ${JSON.stringify(event.data.data)}\n`);
          break;
        case 'error':
          parts.push(`**Error occurred:** ${event.data.error}\n`);
          break;
      }
    }

    parts.push('\n## Your Task\n');
    parts.push('Based on the above history, what should happen next?');
    parts.push('You can either respond to the user or call another tool.');

    return parts.join('\n');
  }
}

async function main() {
  const connector = new OpenAIConnector({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  });

  const tools = {
    search: {
      intent: 'search',
      description: 'Search for information',
      parameters: {
        type: 'object' as const,
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    }
  };

  const toolExecutors = [
    new FunctionToolExecutor('search', async (args) => {
      return {
        results: [`Information about: ${args.query}`]
      };
    })
  ];

  // Create agent with custom context builder
  const agent = new Agent({
    name: 'NarrativeAgent',
    systemPrompt: 'You are a helpful assistant.',
    tools,
    connector,
    toolExecutors,
    contextBuilder: new NarrativeContextBuilder()
  });

  const thread = ThreadManager.create();

  console.log('🤖 Running agent with custom context format...\n');

  const result = await agent.run(
    thread,
    'Search for information about TypeScript'
  );

  console.log('✅ Done!');
  console.log(`Status: ${result.reason}`);

  // Show the custom context that was built
  const contextBuilder = new NarrativeContextBuilder();
  const finalContext = contextBuilder.buildContext(result.thread);
  
  console.log('\n📄 Final Context (as seen by LLM):\n');
  console.log(finalContext);
}

main().catch(console.error);
