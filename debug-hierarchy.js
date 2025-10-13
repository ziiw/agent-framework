// Debug script to test hierarchy conversion
const hierarchyTemplates = {
  'ecommerce-full': {
    id: 'root',
    type: 'parent',
    name: 'E-Commerce Operations Manager',
    systemPrompt: 'You are the Chief Operations Officer for an e-commerce platform. You coordinate all departments including Sales, Logistics, and Customer Service. Analyze requests and delegate to the appropriate department coordinator.',
    icon: '🏢',
    isExpanded: true,
    children: [
      {
        id: 'sales-dept',
        type: 'department',
        name: 'Sales Department',
        systemPrompt: 'You are the Sales Department Coordinator. You manage product catalog operations and pricing strategies.',
        icon: '👔',
        isExpanded: false,
        toolType: 'sales-coordinator',
        children: [
          {
            id: 'product-catalog',
            type: 'specialist',
            name: 'Product Catalog Specialist',
            systemPrompt: 'You are a product catalog specialist for an e-commerce company.',
            icon: '📦',
            toolType: 'product-catalog',
            children: []
          },
          {
            id: 'pricing',
            type: 'specialist',
            name: 'Pricing Specialist',
            systemPrompt: 'You are a pricing and promotions specialist.',
            icon: '💰',
            toolType: 'pricing',
            children: []
          }
        ]
      }
    ]
  }
};

const ecommerceAgentConfigs = {
  'sales-coordinator': {
    name: 'Sales Coordinator',
    systemPrompt: 'You are the Sales Department Coordinator.',
    tools: {
      delegate_to_product_catalog: {
        intent: 'delegate_to_product_catalog',
        description: 'Delegate to Product Catalog Specialist',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        },
        execute: 'async (args) => ({ delegated: true })'
      },
      delegate_to_pricing: {
        intent: 'delegate_to_pricing',
        description: 'Delegate to Pricing Specialist',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        },
        execute: 'async (args) => ({ delegated: true })'
      }
    }
  },
  'product-catalog': {
    name: 'Product Catalog Specialist',
    systemPrompt: 'You are a product catalog specialist.',
    tools: {
      search_products: {
        intent: 'search_products',
        description: 'Search for products in the catalog',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        },
        execute: 'async (args) => ({ products: [] })'
      }
    }
  }
};

function convertHierarchyToConfig(node) {
  const config = {
    name: node.name,
    systemPrompt: node.systemPrompt,
    connector: 'openai-compatible',
    model: 'ibm/granite-4-h-tiny',
    baseURL: 'http://192.168.1.123:1234/v1',
    tools: {},
    subAgents: []
  };

  // Add tools from this node if it has a toolType
  if (node.toolType && ecommerceAgentConfigs[node.toolType]) {
    config.tools = ecommerceAgentConfigs[node.toolType].tools;
  }

  // Add sub-agents (the framework will automatically create delegation tools)
  if (node.children && node.children.length > 0) {
    config.subAgents = node.children.map(child => convertHierarchyToConfig(child));
  }

  return config;
}

const hierarchy = hierarchyTemplates['ecommerce-full'];
const config = convertHierarchyToConfig(hierarchy);

console.log('Generated config:');
console.log(JSON.stringify(config, null, 2));
