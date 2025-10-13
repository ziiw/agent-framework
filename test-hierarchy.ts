import { Agent } from './framework/src/agent';
import { OpenAICompatibleConnector } from './framework/src/connectors/openai-compatible';
import { OpenAIContextBuilder } from './framework/src/context';
import { createAgentHierarchy } from './framework/src/utils/agent-tools';

// Test the hierarchical agent creation
async function testHierarchy() {
  // Create a simple specialist agent
  const specialistAgent = new Agent({
    name: 'Product Catalog Specialist',
    systemPrompt: 'You are a product catalog specialist.',
    tools: {
      search_products: {
        intent: 'search_products',
        description: 'Search for products in the catalog',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        },
        execute: async (args: any) => ({
          products: [
            { id: 'P001', name: 'Wireless Mouse', price: 29.99 }
          ]
        })
      }
    },
    connector: new OpenAICompatibleConnector({
      baseURL: 'http://192.168.1.123:1234/v1',
      model: 'ibm/granite-4-h-tiny'
    }),
    contextBuilder: new OpenAIContextBuilder()
  });

  // Create parent agent with sub-agent
  const { tools } = createAgentHierarchy([
    { agent: specialistAgent }
  ]);

  const parentAgent = new Agent({
    name: 'Chief Operations Officer',
    systemPrompt: 'You are the Chief Operations Officer. Delegate to specialists.',
    tools,
    connector: new OpenAICompatibleConnector({
      baseURL: 'http://192.168.1.123:1234/v1',
      model: 'ibm/granite-4-h-tiny'
    }),
    contextBuilder: new OpenAIContextBuilder()
  });

  console.log('Parent agent tools:', Object.keys(parentAgent.getTools()));
  console.log('Tool descriptions:', Object.values(parentAgent.getTools()).map(t => t.description));
}

testHierarchy().catch(console.error);
