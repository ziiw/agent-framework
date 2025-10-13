#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { Agent } from '../agent';
import { ThreadManager } from '../thread';
import { OpenAICompatibleConnector } from '../connectors/openai-compatible';
import { OpenAIConnector } from '../connectors/openai';
import { OpenAIContextBuilder } from '../context';
import { Thread, StreamChunk } from '../types';

/**
 * CLI for the Agent Framework
 * Demonstrates streaming with reasoning visibility
 */

const program = new Command();

program
  .name('twelve-factor-agent')
  .description('CLI for the Agent Framework')
  .version('0.1.0');

program
  .command('chat')
  .description('Start an interactive chat session with an agent')
  .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4o')
  .option('-k, --api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env var)')
  .action(async (options) => {
    await runChat(options);
  });

program
  .command('run')
  .description('Run a single query')
  .argument('<query>', 'Query to run')
  .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4o')
  .option('-k, --api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env var)')
  .action(async (query, options) => {
    await runSingleQuery(query, options);
  });

async function runChat(options: any) {
  console.log(chalk.bold.cyan('\n🤖 Agent Framework - Interactive Chat\n'));
  console.log(chalk.dim('Type your message and press Enter. Type "exit" to quit.\n'));

  // Create agent with example tools
  let agent: Agent;
  try {
    agent = createExampleAgent(options.model, options.apiKey);
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Failed to initialize agent: ${error.message}\n`));
    console.log(chalk.yellow('💡 Make sure OPENAI_API_KEY is set or use --api-key option\n'));
    process.exit(1);
  }

  let thread = ThreadManager.create({ sessionType: 'chat' });

  const rl = readline.createInterface({ input, output });

  let shouldExit = false;

  // Handle CTRL-C gracefully
  process.on('SIGINT', () => {
    process.stdout.write(chalk.cyan('\nGoodbye! 👋\n'));
    rl.close();
    setTimeout(() => process.exit(0), 100);
  });

  while (!shouldExit) {
    try {
      const userInput = await rl.question(chalk.green('You: '));

      if (userInput.toLowerCase() === 'exit') {
        console.log(chalk.cyan('\nGoodbye! 👋\n'));
        shouldExit = true;
        rl.close();
        break;
      }

      if (!userInput.trim()) {
        continue;
      }

      console.log(''); // Empty line for spacing

      // Run agent with streaming
      let currentReasoning = '';
      let currentContent = '';
      let shouldDisplayTitle = true;
      let showingReasoning = true;
      let reasoningSpinner: any = null;

      // Pause readline during agent response to prevent interference
      rl.pause();

      reasoningSpinner = ora({
        text: chalk.dim('Thinking...'),
        color: 'yellow'
      }).start();

      let result;
      try {
        result = await agent.streamRun(
          thread,
          userInput,
          (chunk: StreamChunk) => {
            switch (chunk.type) {
              case 'reasoning':
                shouldDisplayTitle = true;
                if (!reasoningSpinner) {
                  showingReasoning = true;
                  reasoningSpinner = ora({
                    text: chalk.dim('Thinking...'),
                    color: 'yellow'
                  }).start();
                }
                currentReasoning += chunk.content || '';
                // Update spinner with word-wrapped reasoning (rolling 4 lines)
                const terminalWidth = process.stdout.columns || 80;
                const maxWidth = Math.min(terminalWidth - 15, 100); // Leave space for spinner
                const words = currentReasoning.replace(/\s+/g, ' ').trim().split(' ');
                const allLines: string[] = [];
                let currentLine = '';
                
                // Build all lines from the reasoning text
                for (const word of words) {
                  if ((currentLine + ' ' + word).length <= maxWidth) {
                    currentLine += (currentLine ? ' ' : '') + word;
                  } else {
                    if (currentLine) allLines.push(currentLine);
                    currentLine = word;
                  }
                }
                if (currentLine) allLines.push(currentLine);
                
                // Show only the last 4 lines (rolling window)
                const displayLines = allLines.slice(-4);
                const preview = displayLines.join('\n');
                const hasMore = allLines.length > 4;
                
                if (reasoningSpinner) {
                  reasoningSpinner.text = chalk.dim(`Thinking:\n${hasMore ? '...\n' : ''}${preview}`);
                }
                break;

              case 'content':
                if (reasoningSpinner) {
                  reasoningSpinner.stop();
                  if (currentReasoning.length > 0 && showingReasoning) {
                    console.log(chalk.yellow('💭 Reasoning: ') + chalk.dim(currentReasoning.slice(0, 200) + '...\n'));
                  }
                  reasoningSpinner = null;
                }

                if (shouldDisplayTitle) {
                  process.stdout.write(chalk.blue('Agent: '));
                  shouldDisplayTitle = false;
                }

                if (currentContent === '\n\n') {
                  currentContent = '';
                }

                currentContent += chunk.content || '';
                process.stdout.write(chunk.content || '');
                break;

              case 'tool_call':
                shouldDisplayTitle = true;
                if (reasoningSpinner) {
                  reasoningSpinner.stop();
                  reasoningSpinner = null;
                }
                if (chunk.toolCall) {
                  console.log(chalk.magenta(`🔧 Calling Tool: ${chunk.toolCall.intent}\n`));
                }
                break;

              case 'done':
                if (reasoningSpinner) {
                  reasoningSpinner.stop();
                  reasoningSpinner = null;
                }
                break;
            }
          }
        );
      } catch (streamError: any) {
        if (reasoningSpinner) {
          reasoningSpinner.stop();
        }
        console.log(chalk.red(`\n❌ Stream Error: ${streamError.message}`));
        console.log(chalk.dim(streamError.stack));
        rl.resume(); // Resume readline even on error
        continue;
      }

      // Resume readline after agent response
      rl.resume();

      // Update thread
      thread = result.thread;

      if (currentContent) {
        console.log('\n'); // End the content line
      }

      // Show result if not already displayed
      if (result.message && !currentContent) {
        console.log(chalk.blue('Agent: ') + result.message + '\n');
      }

      // Show status
      if (result.reason === 'error') {
        console.log(chalk.red(`\n❌ Error: ${result.error}\n`));
      } else if (result.reason === 'paused') {
        console.log(chalk.yellow('\n⏸️  Agent paused (awaiting approval or input)\n'));
      }

    } catch (error: any) {
      if (error.message === 'readline was closed' || error.message === 'Aborted with Ctrl+C') {
        shouldExit = true;
        break;
      }
      console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
    }
  }
}

async function runSingleQuery(query: string, options: any) {
  console.log(chalk.bold.cyan('\n🤖 Agent Framework\n'));
  console.log(chalk.green('Query: ') + query + '\n');

  const agent = createExampleAgent(options.model, options.apiKey);
  const thread = ThreadManager.create();

  const spinner = ora('Processing...').start();

  try {
    let reasoning = '';
    let content = '';

    const result = await agent.streamRun(
      thread,
      query,
      (chunk: StreamChunk) => {
        if (chunk.type === 'reasoning') {
          reasoning += chunk.content || '';
          // Update spinner with word-wrapped reasoning (rolling 4 lines)
          const terminalWidth = process.stdout.columns || 80;
          const maxWidth = Math.min(terminalWidth - 15, 100);
          const words = reasoning.replace(/\s+/g, ' ').trim().split(' ');
          const allLines: string[] = [];
          let currentLine = '';
          
          // Build all lines from the reasoning text
          for (const word of words) {
            if ((currentLine + ' ' + word).length <= maxWidth) {
              currentLine += (currentLine ? ' ' : '') + word;
            } else {
              if (currentLine) allLines.push(currentLine);
              currentLine = word;
            }
          }
          if (currentLine) allLines.push(currentLine);
          
          // Show only the last 4 lines (rolling window)
          const displayLines = allLines.slice(-4);
          const preview = displayLines.join('\n');
          const hasMore = allLines.length > 4;
          
          spinner.text = chalk.dim(`Thinking:\n${hasMore ? '...\n' : ''}${preview}`);
        } else if (chunk.type === 'content') {
          content += chunk.content || '';
          spinner.stop();
          if (!content) {
            process.stdout.write(chalk.blue('Response: '));
          }
          process.stdout.write(chunk.content || '');
        }
      }
    );

    spinner.stop();

    if (reasoning) {
      console.log(chalk.yellow('\n\n💭 Reasoning:\n') + chalk.dim(reasoning));
    }

    if (!content && result.message) {
      console.log(chalk.blue('\nResponse: ') + result.message);
    }

    console.log(chalk.dim(`\n\nStatus: ${result.reason}`));
    console.log(chalk.dim(`Events: ${result.thread.events.length}`));
    console.log();

  } catch (error: any) {
    spinner.stop();
    console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}

function createExampleAgent(model: string, apiKey?: string): Agent {
  // OpenAI Compatible (e.g., local models)
  const connector = new OpenAICompatibleConnector({
    baseURL: 'http://192.168.1.123:1234/v1',
    model: 'ibm/granite-4-h-tiny'
  });

  // OpenAI
  // const connector = new OpenAIConnector({
  //   apiKey: apiKey || process.env.OPENAI_API_KEY,
  //   model
  // });

  // Define tools with inline execute methods
  const tools = {
    calculate: {
      intent: 'calculate',
      description: 'Perform a mathematical calculation',
      parameters: {
        type: 'object' as const,
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2")'
          }
        },
        required: ['expression']
      },
      execute: async (args: any) => {
        try {
          // Simple eval (don't do this in production!)
          const result = eval(args.expression);
          return { result, expression: args.expression };
        } catch (error: any) {
          throw new Error(`Invalid expression: ${error.message}`);
        }
      }
    },
    get_time: {
      intent: 'get_time',
      description: 'Get the current time',
      parameters: {
        type: 'object' as const,
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone (optional, defaults to local)'
          }
        }
      },
      execute: async (args: any) => {
        const now = new Date();
        return {
          time: now.toISOString(),
          timezone: args.timezone || 'local',
          formatted: now.toLocaleString()
        };
      }
    },
    search: {
      intent: 'search',
      description: 'Search for information (simulated)',
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          }
        },
        required: ['query']
      },
      execute: async (args: any) => {
        // Simulated search
        return {
          query: args.query,
          results: [
            'This is a simulated search result.',
            'In a real implementation, this would call a search API.',
            'The framework supports any async tool execution.'
          ]
        };
      }
    },
    get_recipe_by_ingredients: {
      intent: 'get_recipe_by_ingredients',
      description: 'Get recipe by ingredients (simulated)',
      parameters: {
        type: 'object' as const,
        properties: {
          ingredients: {
            type: 'array',
            description: 'A list of ingredients available for the recipe',
            items: {
              type: 'string',
              description: 'An individual ingredient'
            }
          },
          dietary_preferences: {
            type: 'string',
            description: 'Optional dietary preferences or restrictions (e.g., vegetarian, vegan, gluten-free)'
          },
          max_time_minutes: {
            type: 'integer',
            description: 'Maximum cooking time in minutes'
          },
          number_of_servings: {
            type: 'integer',
            description: 'Desired number of servings'
          }
        },
        required: ['ingredients']
      },
      execute: async (args: any) => {
        // Simulated recipe search
        return {
          query: args,
          results: ['Good recipe of chicken and rice is chicken biryani.']
        };
      }
    }
  };

  // Create agent (no separate toolExecutors needed!)
  return new Agent({
    name: 'ExampleAgent',
    systemPrompt: `You are a helpful assistant with access to tools.
You can perform calculations, get the current time, search for information, and find recipes by ingredients.
Always use tools when appropriate to help the user.
Be concise and clear in your responses.`,
    tools,
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });
}

// Run the CLI
program.parse();
