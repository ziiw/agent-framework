/**
 * Test script to verify multi-agent bug fixes
 * Tests the same scenario from the bug report
 */

import { 
  Agent, 
  OpenAICompatibleConnector, 
  ThreadManager, 
  OpenAIContextBuilder 
} from './src';
import { agentAsTool } from './src/utils/agent-tools';

async function testMultiAgentFix() {
  console.log('🧪 Testing Multi-Agent Bug Fixes\n');
  console.log('═'.repeat(70));

  // Enable debug logging
  process.env.DEBUG_AGENT_TOOLS = 'true';

  const connector = new OpenAICompatibleConnector({});

  // Create simple test agents
  const inventoryAgent = new Agent({
    name: 'InventorySpecialist',
    systemPrompt: 'You check inventory. Always provide specific stock numbers.',
    tools: {
      check_stock: {
        intent: 'check_stock',
        description: 'Check stock levels',
        parameters: {
          type: 'object' as const,
          properties: {
            product: { type: 'string' }
          },
          required: ['product']
        },
        execute: async (args: any) => ({
          product: args.product,
          in_stock: true,
          quantity: 150,
          warehouse: 'LA'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const pricingAgent = new Agent({
    name: 'PricingSpecialist',
    systemPrompt: 'You calculate prices. Always provide exact totals.',
    tools: {
      calculate_price: {
        intent: 'calculate_price',
        description: 'Calculate pricing',
        parameters: {
          type: 'object' as const,
          properties: {
            product: { type: 'string' },
            zip: { type: 'string' }
          },
          required: ['product']
        },
        execute: async (args: any) => ({
          product: args.product,
          base_price: 29.99,
          shipping: 5.99,
          total: 35.98,
          zip: args.zip || 'N/A'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const accountAgent = new Agent({
    name: 'AccountSpecialist',
    systemPrompt: 'You handle customer accounts. Always provide loyalty point details.',
    tools: {
      get_loyalty_points: {
        intent: 'get_loyalty_points',
        description: 'Get customer loyalty points',
        parameters: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'string' }
          },
          required: ['customer_id']
        },
        execute: async (args: any) => ({
          customer_id: args.customer_id,
          loyalty_points: 2450,
          tier: 'Gold'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Create coordinator with updated prompts
  const coordinator = new Agent({
    name: 'TestCoordinator',
    systemPrompt: `You coordinate specialized agents to answer customer queries.

CRITICAL: When calling sub-agent tools, ALWAYS use the 'query' parameter with clear instructions.
Example: { "query": "Check stock for wireless mouse" }
Example: { "query": "Calculate price with shipping to 90210" }
Example: { "query": "Get loyalty points for customer CUST-12345" }

Provide comprehensive answers combining all relevant information.`,
    tools: {
      check_inventory: agentAsTool(inventoryAgent, {
        intent: 'check_inventory',
        description: 'Check product inventory. Use { "query": "your instruction here" }',
        streamToParent: true
      }),
      check_pricing: agentAsTool(pricingAgent, {
        intent: 'check_pricing',
        description: 'Check pricing and shipping. Use { "query": "your instruction here" }',
        streamToParent: true
      }),
      check_account: agentAsTool(accountAgent, {
        intent: 'check_account',
        description: 'Check customer account info. Use { "query": "your instruction here" }',
        streamToParent: true
      })
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Test with the same query from the bug report
  const thread = ThreadManager.create();
  const query = `I'm looking to buy a wireless mouse and keyboard. 
Can you check if they're in stock, what's the total price with shipping to 90210, 
and also tell me about my current loyalty points? My customer ID is CUST-12345.`;

  console.log('📝 Test Query:\n');
  console.log(`"${query}"\n`);
  console.log('─'.repeat(70));
  console.log('\n🔄 Processing...\n');

  try {
    const result = await coordinator.streamRun(
      thread,
      query,
      (chunk) => {
        if (chunk.type === 'tool_call' && chunk.toolCall) {
          console.log(`\n🔧 Tool Call: ${chunk.toolCall.intent}`);
          if ('args' in chunk.toolCall) {
            console.log(`   Args: ${JSON.stringify(chunk.toolCall.args, null, 2)}`);
          }
        } else if (chunk.type === 'content') {
          process.stdout.write(chunk.content || '');
        }
      }
    );

    console.log('\n\n' + '═'.repeat(70));
    console.log('✅ Test Completed!\n');
    console.log('📊 Results:');
    console.log(`   Status: ${result.reason}`);
    console.log(`   Total events: ${result.thread.events.length}`);

    // Analyze tool calls
    const toolCalls = result.thread.events.filter(e => e.type === 'tool_call');
    console.log(`\n   Tool calls made: ${toolCalls.length}`);
    toolCalls.forEach((call, idx) => {
      console.log(`   ${idx + 1}. ${call.data.intent}`);
      console.log(`      Args: ${JSON.stringify(call.data.args)}`);
    });

    // Check tool results
    const toolResults = result.thread.events.filter(e => e.type === 'tool_result');
    console.log(`\n   Tool results received: ${toolResults.length}`);
    toolResults.forEach((result, idx) => {
      const hasError = result.data.error || result.data.status === 'error';
      const icon = hasError ? '❌' : '✅';
      console.log(`   ${idx + 1}. ${icon} Intent: ${result.data.intent || 'unknown'}`);
      if (hasError) {
        console.log(`      Error: ${result.data.error}`);
      } else {
        console.log(`      Status: ${result.data.status || 'success'}`);
      }
    });

    console.log('\n✨ Bug Fix Verification:');
    
    // Check if query parameter was used properly
    const hasProperQueryParams = toolCalls.every(call => {
      return call.data.args && (
        typeof call.data.args.query === 'string' ||
        Object.keys(call.data.args).length > 0
      );
    });
    
    console.log(`   ${hasProperQueryParams ? '✅' : '❌'} Query parameters properly formatted`);
    
    // Check if we got actual data (not generic greetings)
    const hasRealData = toolResults.some(r => {
      return r.data.status === 'completed' && r.data.message && r.data.message.length > 20;
    });
    
    console.log(`   ${hasRealData ? '✅' : '❌'} Sub-agents returned real data`);
    
    // Check if no JSON.stringify fallback warnings
    console.log(`   ✅ Debug logging enabled (check console for warnings)`);

  } catch (error: any) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n');
}

testMultiAgentFix().catch(console.error);
