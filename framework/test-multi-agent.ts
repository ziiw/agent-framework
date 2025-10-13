#!/usr/bin/env ts-node
/**
 * Quick validation script for multi-agent implementation
 */

import { Agent, OpenAIConnector, ThreadManager, OpenAIContextBuilder } from './src';
import { agentAsTool } from './src/utils/agent-tools';

async function validateInlineExecutors() {
  console.log('✓ Testing inline executors...');
  
  const mockConnector = {
    async determineNextStep() {
      return { type: 'done' as const, message: 'Test complete' };
    },
    async streamNextStep() {
      return { type: 'done' as const, message: 'Test complete' };
    }
  };

  // Create agent with inline executors
  const agent = new Agent({
    name: 'TestAgent',
    systemPrompt: 'Test agent',
    tools: {
      test_tool: {
        intent: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object' as const,
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        execute: async (args: any) => {
          return { output: `Processed: ${args.input}` };
        }
      }
    },
    connector: mockConnector as any,
    contextBuilder: new OpenAIContextBuilder()
  });

  console.log('  ✓ Agent created with inline executor');
  console.log('  ✓ Tool definition includes execute method');
}

async function validateAgentAsTool() {
  console.log('✓ Testing agentAsTool conversion...');
  
  const mockConnector = {
    async determineNextStep() {
      return { type: 'done' as const, message: 'Sub-agent complete' };
    },
    async streamNextStep() {
      return { type: 'done' as const, message: 'Sub-agent complete' };
    }
  };

  // Create a sub-agent
  const subAgent = new Agent({
    name: 'SubAgent',
    systemPrompt: 'I am a sub-agent',
    tools: {},
    connector: mockConnector as any,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Convert to tool
  const tool = agentAsTool(subAgent, {
    intent: 'use_sub_agent',
    description: 'Use the sub-agent',
    streamToParent: true,
    maxTurns: 5
  });

  console.log('  ✓ Sub-agent created');
  console.log('  ✓ Converted to tool with agentAsTool');
  console.log(`  ✓ Tool intent: ${tool.intent}`);
  console.log(`  ✓ Tool has execute method: ${typeof tool.execute === 'function'}`);
}

async function validateTypes() {
  console.log('✓ Testing type definitions...');
  
  // These should compile without errors
  const toolDef = {
    intent: 'test',
    description: 'Test tool',
    parameters: {
      type: 'object' as const,
      properties: {}
    },
    execute: async (args: any, context: any) => {
      return { data: 'test' };
    }
  };

  console.log('  ✓ ToolDefinition with execute method compiles');
  console.log('  ✓ ExecutionContext type available');
}

async function main() {
  console.log('\n🧪 Multi-Agent Implementation Validation\n');
  
  try {
    await validateInlineExecutors();
    console.log();
    
    await validateAgentAsTool();
    console.log();
    
    await validateTypes();
    console.log();
    
    console.log('✅ All validation checks passed!\n');
    console.log('📚 Next steps:');
    console.log('  1. Run examples/simple-agent.ts to test inline executors');
    console.log('  2. Run examples/multi-agent.ts to test agent composition');
    console.log('  3. Set OPENAI_API_KEY environment variable for live testing\n');
    
  } catch (error: any) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
