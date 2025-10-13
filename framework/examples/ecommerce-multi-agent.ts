/**
 * E-Commerce Multi-Agent System Example
 * 
 * Demonstrates a 3-level hierarchical agent system for a large e-commerce company:
 * 
 * Level 1: Chief Operations Agent (Main Coordinator)
 * Level 2: Department Coordinators (Sales, Logistics, Customer Service)
 * Level 3: Specialist Agents (Order Processing, Inventory, Shipping, Returns, etc.)
 * 
 * This shows how to build complex enterprise systems using agent composition.
 */

import { 
  Agent, 
  OpenAICompatibleConnector, 
  ThreadManager, 
  OpenAIContextBuilder 
} from '../src';
import { agentAsTool } from '../src/utils/agent-tools';
import chalk from 'chalk';
import ora from 'ora';

async function main() {
  console.log('🏢 E-Commerce Multi-Agent System Demo\n');
  console.log('═'.repeat(70));
  console.log('Three-Level Hierarchy:');
  console.log('Level 1: Chief Operations Agent');
  console.log('Level 2: Department Coordinators (Sales, Logistics, Support)');
  console.log('Level 3: Specialist Agents (8 specialized agents)');
  console.log('═'.repeat(70));
  console.log('\n');

  const connector = new OpenAICompatibleConnector({
    model: 'ibm/granite-4-h-tiny',
    baseURL: 'http://192.168.1.123:1234/v1'
  });

  // ========================================
  // LEVEL 3: SPECIALIST AGENTS
  // ========================================

  // Sales Specialists
  const productCatalogAgent = new Agent({
    name: 'ProductCatalogSpecialist',
    systemPrompt: `You are a product catalog specialist for an e-commerce company.
You manage product information, pricing, availability, and recommendations.
Always provide accurate product details and suggest relevant alternatives when items are unavailable.`,
    tools: {
      search_products: {
        intent: 'search_products',
        description: 'Search for products in the catalog',
        parameters: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { type: 'string', description: 'Product category filter' },
            max_price: { type: 'number', description: 'Maximum price filter' }
          },
          required: ['query']
        },
        execute: async (args: any) => ({
          products: [
            { id: 'P001', name: 'Wireless Mouse', price: 29.99, stock: 150, category: 'Electronics' },
            { id: 'P002', name: 'Ergonomic Keyboard', price: 79.99, stock: 85, category: 'Electronics' },
            { id: 'P003', name: 'USB-C Hub', price: 49.99, stock: 220, category: 'Electronics' }
          ],
          query: args.query,
          total_results: 3
        })
      },
      check_stock: {
        intent: 'check_stock',
        description: 'Check real-time stock availability for products',
        parameters: {
          type: 'object' as const,
          properties: {
            product_ids: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'List of product IDs to check' 
            }
          },
          required: ['product_ids']
        },
        execute: async (args: any) => ({
          stock_status: args.product_ids.map((id: string) => ({
            product_id: id,
            available: Math.random() > 0.2,
            quantity: Math.floor(Math.random() * 200) + 50,
            warehouse: ['NYC', 'LA', 'Chicago', 'Dallas'][Math.floor(Math.random() * 4)]
          }))
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const pricingAgent = new Agent({
    name: 'PricingSpecialist',
    systemPrompt: `You are a pricing and promotions specialist.
You handle price calculations, discounts, promotional codes, and special offers.
Always apply the best available discount for customers.`,
    tools: {
      calculate_price: {
        intent: 'calculate_price',
        description: 'Calculate final price with discounts and promotions',
        parameters: {
          type: 'object' as const,
          properties: {
            product_id: { type: 'string' },
            quantity: { type: 'number' },
            promo_code: { type: 'string', description: 'Optional promotional code' }
          },
          required: ['product_id', 'quantity']
        },
        execute: async (args: any) => {
          const basePrice = 29.99;
          const subtotal = basePrice * args.quantity;
          const discount = args.promo_code ? subtotal * 0.15 : 0;
          return {
            product_id: args.product_id,
            quantity: args.quantity,
            base_price: basePrice,
            subtotal: subtotal,
            discount: discount,
            tax: (subtotal - discount) * 0.08,
            total: (subtotal - discount) * 1.08,
            promo_applied: args.promo_code || null
          };
        }
      },
      validate_promo_code: {
        intent: 'validate_promo_code',
        description: 'Validate promotional codes',
        parameters: {
          type: 'object' as const,
          properties: {
            code: { type: 'string' }
          },
          required: ['code']
        },
        execute: async (args: any) => ({
          valid: ['SAVE15', 'WELCOME20', 'FREESHIP'].includes(args.code.toUpperCase()),
          discount_percent: args.code.toUpperCase() === 'SAVE15' ? 15 : args.code.toUpperCase() === 'WELCOME20' ? 20 : 0,
          description: args.code.toUpperCase() === 'SAVE15' ? '15% off entire order' : 'Invalid code'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Logistics Specialists
  const inventoryAgent = new Agent({
    name: 'InventorySpecialist',
    systemPrompt: `You are an inventory management specialist.
You track stock levels, manage warehouse operations, and handle inventory transfers.
Always ensure accurate inventory data and prevent stockouts.`,
    tools: {
      check_warehouse_stock: {
        intent: 'check_warehouse_stock',
        description: 'Check stock levels across all warehouses',
        parameters: {
          type: 'object' as const,
          properties: {
            product_id: { type: 'string' },
            warehouse: { type: 'string', description: 'Optional specific warehouse' }
          },
          required: ['product_id']
        },
        execute: async (args: any) => ({
          product_id: args.product_id,
          warehouses: [
            { location: 'NYC', quantity: 150, status: 'In Stock' },
            { location: 'LA', quantity: 200, status: 'In Stock' },
            { location: 'Chicago', quantity: 75, status: 'Low Stock' },
            { location: 'Dallas', quantity: 180, status: 'In Stock' }
          ],
          total_quantity: 605,
          recommended_warehouse: 'LA'
        })
      },
      reserve_inventory: {
        intent: 'reserve_inventory',
        description: 'Reserve inventory for an order',
        parameters: {
          type: 'object' as const,
          properties: {
            order_id: { type: 'string' },
            items: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'string' },
                  quantity: { type: 'number' }
                }
              }
            }
          },
          required: ['order_id', 'items']
        },
        execute: async (args: any) => ({
          order_id: args.order_id,
          reservation_id: `RES-${Date.now()}`,
          reserved_items: args.items,
          warehouse: 'LA',
          expires_in_minutes: 15,
          status: 'Reserved'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const shippingAgent = new Agent({
    name: 'ShippingSpecialist',
    systemPrompt: `You are a shipping and delivery specialist.
You calculate shipping costs, estimate delivery times, and track shipments.
Always provide the most cost-effective and timely shipping options.`,
    tools: {
      calculate_shipping: {
        intent: 'calculate_shipping',
        description: 'Calculate shipping costs and delivery estimates',
        parameters: {
          type: 'object' as const,
          properties: {
            destination_zip: { type: 'string' },
            weight_lbs: { type: 'number' },
            shipping_method: { 
              type: 'string',
              enum: ['standard', 'express', 'overnight'],
              description: 'Shipping method'
            }
          },
          required: ['destination_zip', 'weight_lbs']
        },
        execute: async (args: any) => {
          const rates = {
            standard: { cost: 5.99, days: 5 },
            express: { cost: 12.99, days: 2 },
            overnight: { cost: 24.99, days: 1 }
          };
          const method = args.shipping_method || 'standard';
          return {
            destination: args.destination_zip,
            weight: args.weight_lbs,
            options: [
              { method: 'Standard', cost: 5.99, estimated_days: 5, carrier: 'USPS' },
              { method: 'Express', cost: 12.99, estimated_days: 2, carrier: 'FedEx' },
              { method: 'Overnight', cost: 24.99, estimated_days: 1, carrier: 'FedEx' }
            ],
            recommended: 'Express'
          };
        }
      },
      track_shipment: {
        intent: 'track_shipment',
        description: 'Track shipment status',
        parameters: {
          type: 'object' as const,
          properties: {
            tracking_number: { type: 'string' }
          },
          required: ['tracking_number']
        },
        execute: async (args: any) => ({
          tracking_number: args.tracking_number,
          status: 'In Transit',
          current_location: 'Memphis, TN',
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          history: [
            { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), location: 'LA Warehouse', event: 'Package shipped' },
            { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), location: 'Phoenix, AZ', event: 'In transit' },
            { date: new Date().toISOString(), location: 'Memphis, TN', event: 'Arrived at sort facility' }
          ]
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Customer Service Specialists
  const orderProcessingAgent = new Agent({
    name: 'OrderProcessingSpecialist',
    systemPrompt: `You are an order processing specialist.
You handle order creation, modifications, cancellations, and status checks.
Always ensure orders are processed accurately and efficiently.`,
    tools: {
      create_order: {
        intent: 'create_order',
        description: 'Create a new order',
        parameters: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'string' },
            items: { type: 'array' },
            shipping_address: { type: 'object' }
          },
          required: ['customer_id', 'items']
        },
        execute: async (args: any) => ({
          order_id: `ORD-${Date.now()}`,
          customer_id: args.customer_id,
          items: args.items,
          status: 'Pending',
          created_at: new Date().toISOString(),
          estimated_ship_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      },
      get_order_status: {
        intent: 'get_order_status',
        description: 'Get order status and details',
        parameters: {
          type: 'object' as const,
          properties: {
            order_id: { type: 'string' }
          },
          required: ['order_id']
        },
        execute: async (args: any) => ({
          order_id: args.order_id,
          status: 'Shipped',
          tracking_number: 'TRK123456789',
          items: [
            { product_id: 'P001', name: 'Wireless Mouse', quantity: 2, price: 29.99 }
          ],
          total: 71.98,
          shipped_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        })
      },
      cancel_order: {
        intent: 'cancel_order',
        description: 'Cancel an order if eligible',
        parameters: {
          type: 'object' as const,
          properties: {
            order_id: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['order_id']
        },
        execute: async (args: any) => ({
          order_id: args.order_id,
          cancelled: true,
          refund_amount: 71.98,
          refund_method: 'Original payment method',
          estimated_refund_days: 5,
          cancellation_reason: args.reason || 'Customer request'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const returnsAgent = new Agent({
    name: 'ReturnsSpecialist',
    systemPrompt: `You are a returns and refunds specialist.
You handle return requests, generate return labels, and process refunds.
Always provide excellent customer service and make returns easy.`,
    tools: {
      initiate_return: {
        intent: 'initiate_return',
        description: 'Initiate a product return',
        parameters: {
          type: 'object' as const,
          properties: {
            order_id: { type: 'string' },
            items: { type: 'array' },
            reason: { type: 'string' }
          },
          required: ['order_id', 'items', 'reason']
        },
        execute: async (args: any) => ({
          return_id: `RET-${Date.now()}`,
          order_id: args.order_id,
          items: args.items,
          reason: args.reason,
          return_label_url: 'https://returns.example.com/label/RET123',
          return_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_refund_amount: 59.98,
          instructions: 'Pack items securely, attach prepaid label, drop off at any carrier location'
        })
      },
      check_return_eligibility: {
        intent: 'check_return_eligibility',
        description: 'Check if items are eligible for return',
        parameters: {
          type: 'object' as const,
          properties: {
            order_id: { type: 'string' },
            item_ids: { type: 'array' }
          },
          required: ['order_id']
        },
        execute: async (args: any) => ({
          order_id: args.order_id,
          eligible: true,
          days_remaining: 25,
          return_window_days: 30,
          conditions: ['Items must be unused', 'Original packaging required', 'All accessories included']
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const customerAccountAgent = new Agent({
    name: 'CustomerAccountSpecialist',
    systemPrompt: `You are a customer account specialist.
You manage customer profiles, preferences, order history, and loyalty programs.
Always protect customer privacy and provide personalized service.`,
    tools: {
      get_customer_info: {
        intent: 'get_customer_info',
        description: 'Get customer account information',
        parameters: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'string' }
          },
          required: ['customer_id']
        },
        execute: async (args: any) => ({
          customer_id: args.customer_id,
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          member_since: '2022-03-15',
          loyalty_tier: 'Gold',
          loyalty_points: 2450,
          total_orders: 23,
          lifetime_value: 1847.50,
          preferred_warehouse: 'LA'
        })
      },
      get_order_history: {
        intent: 'get_order_history',
        description: 'Get customer order history',
        parameters: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'string' },
            limit: { type: 'number', description: 'Number of recent orders' }
          },
          required: ['customer_id']
        },
        execute: async (args: any) => ({
          customer_id: args.customer_id,
          orders: [
            { order_id: 'ORD-001', date: '2025-09-15', total: 129.99, status: 'Delivered' },
            { order_id: 'ORD-002', date: '2025-08-22', total: 89.99, status: 'Delivered' },
            { order_id: 'ORD-003', date: '2025-07-10', total: 199.99, status: 'Delivered' }
          ],
          total_orders: 23
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const supportTicketAgent = new Agent({
    name: 'SupportTicketSpecialist',
    systemPrompt: `You are a support ticket specialist.
You create, track, and resolve customer support tickets.
Always document issues clearly and follow up promptly.`,
    tools: {
      create_ticket: {
        intent: 'create_ticket',
        description: 'Create a customer support ticket',
        parameters: {
          type: 'object' as const,
          properties: {
            customer_id: { type: 'string' },
            subject: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
          },
          required: ['customer_id', 'subject', 'description']
        },
        execute: async (args: any) => ({
          ticket_id: `TKT-${Date.now()}`,
          customer_id: args.customer_id,
          subject: args.subject,
          description: args.description,
          priority: args.priority || 'medium',
          status: 'Open',
          assigned_to: 'Support Team',
          created_at: new Date().toISOString(),
          sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })
      },
      get_ticket_status: {
        intent: 'get_ticket_status',
        description: 'Get support ticket status',
        parameters: {
          type: 'object' as const,
          properties: {
            ticket_id: { type: 'string' }
          },
          required: ['ticket_id']
        },
        execute: async (args: any) => ({
          ticket_id: args.ticket_id,
          status: 'In Progress',
          priority: 'high',
          assigned_to: 'Senior Support Agent',
          last_update: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updates: [
            { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), message: 'Ticket created' },
            { date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), message: 'Assigned to specialist' }
          ]
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // ========================================
  // LEVEL 2: DEPARTMENT COORDINATORS
  // ========================================

  const salesCoordinator = new Agent({
    name: 'SalesCoordinator',
    systemPrompt: `You are the Sales Department Coordinator.
You manage product catalog operations and pricing strategies.
You coordinate between product catalog specialists and pricing specialists.

Your responsibilities:
- Product search and recommendations
- Stock availability checks
- Price calculations and promotions
- Product information and comparisons

Delegate tasks to:
- ProductCatalogSpecialist: For product searches, stock checks, catalog queries
- PricingSpecialist: For price calculations, promotions, discount validation

IMPORTANT: When calling sub-agent tools, always use the 'query' parameter with a clear, natural language instruction.
Example: { "query": "Search for wireless mouse and keyboard products" }

Always provide comprehensive responses that help close sales.`,
    tools: {
      ask_product_catalog: agentAsTool(productCatalogAgent, {
        intent: 'ask_product_catalog',
        description: 'Delegate product catalog queries to the specialist. Use { "query": "search for wireless mouse" }',
        streamToParent: true
      }),
      ask_pricing: agentAsTool(pricingAgent, {
        intent: 'ask_pricing',
        description: 'Delegate pricing and promotion queries to the specialist. Use { "query": "calculate price for product P001" }',
        streamToParent: true
      })
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const logisticsCoordinator = new Agent({
    name: 'LogisticsCoordinator',
    systemPrompt: `You are the Logistics Department Coordinator.
You oversee inventory management and shipping operations.
You coordinate between inventory specialists and shipping specialists.

Your responsibilities:
- Inventory tracking and management
- Warehouse operations
- Shipping cost calculations
- Delivery tracking and estimates

Delegate tasks to:
- InventorySpecialist: For stock checks, warehouse operations, inventory reservations
- ShippingSpecialist: For shipping costs, delivery estimates, shipment tracking

IMPORTANT: When calling sub-agent tools, always use the 'query' parameter with a clear, natural language instruction.
Example: { "query": "Check warehouse stock for wireless mouse and keyboard" }

Ensure efficient logistics operations and timely deliveries.`,
    tools: {
      ask_inventory: agentAsTool(inventoryAgent, {
        intent: 'ask_inventory',
        description: 'Delegate inventory management tasks to the specialist. Use { "query": "check warehouse stock for product P001" }',
        streamToParent: true
      }),
      ask_shipping: agentAsTool(shippingAgent, {
        intent: 'ask_shipping',
        description: 'Delegate shipping and delivery tasks to the specialist. Use { "query": "calculate shipping to 90210" }',
        streamToParent: true
      })
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  const customerServiceCoordinator = new Agent({
    name: 'CustomerServiceCoordinator',
    systemPrompt: `You are the Customer Service Department Coordinator.
You oversee order processing, returns, account management, and support operations.
You coordinate between multiple customer service specialists.

Your responsibilities:
- Order management and processing
- Return and refund handling
- Customer account support
- Support ticket management

Delegate tasks to:
- OrderProcessingSpecialist: For order creation, status checks, cancellations
- ReturnsSpecialist: For return requests, eligibility checks, refund processing
- CustomerAccountSpecialist: For account info, order history, loyalty programs
- SupportTicketSpecialist: For creating and tracking support tickets

IMPORTANT: When calling sub-agent tools, always use the 'query' parameter with a clear, natural language instruction.
Example: { "query": "Get loyalty points for customer ID CUST-12345" }

Always prioritize customer satisfaction and quick resolution.`,
    tools: {
      ask_order_processing: agentAsTool(orderProcessingAgent, {
        intent: 'ask_order_processing',
        description: 'Delegate order processing tasks to the specialist. Use { "query": "get order status for ORD-123" }',
        streamToParent: true
      }),
      ask_returns: agentAsTool(returnsAgent, {
        intent: 'ask_returns',
        description: 'Delegate return and refund tasks to the specialist. Use { "query": "initiate return for order ORD-123" }',
        streamToParent: true
      }),
      ask_customer_account: agentAsTool(customerAccountAgent, {
        intent: 'ask_customer_account',
        description: 'Delegate customer account tasks to the specialist. Use { "query": "get loyalty points for CUST-12345" }',
        streamToParent: true
      }),
      ask_support_ticket: agentAsTool(supportTicketAgent, {
        intent: 'ask_support_ticket',
        description: 'Delegate support ticket tasks to the specialist. Use { "query": "create ticket for shipping issue" }',
        streamToParent: true
      })
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // ========================================
  // LEVEL 1: CHIEF OPERATIONS AGENT
  // ========================================

  const chiefOperationsAgent = new Agent({
    name: 'ChiefOperationsAgent',
    systemPrompt: `You are the Chief Operations Agent for a large e-commerce company.
You are the main coordinator who oversees all departments and orchestrates complex operations.

You manage three department coordinators:
1. SalesCoordinator: Handles product catalog, pricing, and sales operations
2. LogisticsCoordinator: Manages inventory, warehouses, and shipping
3. CustomerServiceCoordinator: Oversees orders, returns, accounts, and support

Your responsibilities:
- Analyze customer requests and determine which departments are needed
- Coordinate across multiple departments for complex queries
- Synthesize information from multiple sources into coherent responses
- Ensure seamless customer experience across all touchpoints

Decision-making guidelines:
- For product queries, pricing, stock → Delegate to SalesCoordinator
- For inventory, shipping, tracking → Delegate to LogisticsCoordinator  
- For orders, returns, accounts, support → Delegate to CustomerServiceCoordinator
- For complex operations → Delegate to multiple coordinators as needed

CRITICAL: When delegating to coordinators, ALWAYS use the 'query' parameter with a clear, natural language instruction.
Example: { "query": "Check stock availability for wireless mouse and keyboard products" }
Example: { "query": "Calculate total price with shipping to ZIP code 90210 for 2 items" }
Example: { "query": "Get loyalty points for customer ID CUST-12345" }

Always provide comprehensive, accurate responses and escalate to appropriate departments efficiently.`,
    tools: {
      ask_sales_coordinator: agentAsTool(salesCoordinator, {
        intent: 'ask_sales_coordinator',
        description: 'Delegate sales, product catalog, and pricing tasks to Sales Coordinator. Use { "query": "find wireless mouse and keyboard with pricing" }',
        streamToParent: true,
        maxTurns: 8
      }),
      ask_logistics_coordinator: agentAsTool(logisticsCoordinator, {
        intent: 'ask_logistics_coordinator',
        description: 'Delegate inventory, warehouse, and shipping tasks to Logistics Coordinator. Use { "query": "check stock and calculate shipping to 90210" }',
        streamToParent: true,
        maxTurns: 8
      }),
      ask_customer_service_coordinator: agentAsTool(customerServiceCoordinator, {
        intent: 'ask_customer_service_coordinator',
        description: 'Delegate order management, returns, accounts, and support tasks to Customer Service Coordinator. Use { "query": "get loyalty points for customer CUST-12345" }',
        streamToParent: true,
        maxTurns: 8
      })
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // ========================================
  // RUN COMPLEX E-COMMERCE SCENARIOS
  // ========================================

  const thread = ThreadManager.create();

  const query = `I'm looking to buy some office supplies - specifically a wireless mouse and keyboard. 
Can you check if they're in stock, what's the total price with shipping to 90210, 
and also tell me about my current loyalty points? My customer ID is CUST-12345.`;

  console.log(chalk.bold.cyan('📝 Customer Query:\n'));
  console.log(chalk.green(`"${query}"\n`));
  console.log(chalk.dim('─'.repeat(70)));
  console.log('\n' + chalk.yellow('🔄 Processing through 3-level hierarchy...\n'));

  // Track reasoning and content for display
  let currentReasoning = '';
  let currentContent = '';
  let reasoningSpinner: any = null;
  let hasShownResponse = false;

  const result = await chiefOperationsAgent.streamRun(
    thread,
    query,
    (chunk) => {
      if (chunk.type === 'tool_call' && chunk.toolCall && chunk.toolCall.intent) {
        // Stop reasoning spinner when tool calls start
        if (reasoningSpinner) {
          reasoningSpinner.stop();
          if (currentReasoning.length > 0) {
            console.log(chalk.yellow('💭 Reasoning: ') + chalk.dim(currentReasoning.slice(0, 200) + '...\n'));
          }
          reasoningSpinner = null;
        }

        const intent = chunk.toolCall.intent;
        const indent = intent.includes('coordinator') ? '  ' : 
                      intent.includes('ask_') ? '    ' : '      ';
        console.log(`${indent}${chalk.magenta('🔧')} ${chalk.cyan(intent)}`);
      } else if (chunk.type === 'reasoning') {
        if (!reasoningSpinner) {
          reasoningSpinner = ora({
            text: chalk.dim('Thinking...'),
            color: 'gray'
          }).start();
        }
        currentReasoning += chunk.content || '';
        
        // Update spinner with word-wrapped reasoning (rolling 4 lines)
        const terminalWidth = process.stdout.columns || 80;
        const maxWidth = Math.min(terminalWidth - 15, 100);
        const words = currentReasoning.replace(/\s+/g, ' ').trim().split(' ');
        const allLines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          if ((currentLine + ' ' + word).length <= maxWidth) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) allLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) allLines.push(currentLine);
        
        const displayLines = allLines.slice(-4);
        const preview = displayLines.join('\n');
        const hasMore = allLines.length > 4;
        
        reasoningSpinner.text = chalk.dim(`Thinking:\n${hasMore ? '...\n' : ''}${preview}`);
      } else if (chunk.type === 'content') {
        if (reasoningSpinner) {
          reasoningSpinner.stop();
          if (currentReasoning.length > 0) {
            console.log(chalk.yellow('\n💭 Reasoning: ') + chalk.dim(currentReasoning.slice(0, 200) + '...\n'));
          }
          reasoningSpinner = null;
        }

        if (!hasShownResponse) {
          console.log(chalk.blue('\n📋 Response:\n'));
          hasShownResponse = true;
        }

        currentContent += chunk.content || '';
        process.stdout.write(chunk.content || '');
      }
    }
  );

  if (reasoningSpinner) {
    reasoningSpinner.stop();
  }

  if (currentContent) {
    console.log('\n');
  }

  console.log(chalk.dim('═'.repeat(70)));
  console.log(chalk.bold.green('✅ Operations Completed!\n'));
  console.log(chalk.cyan('📊 Execution Summary:'));
  console.log(chalk.dim(`   Status: ${result.reason}`));
  console.log(chalk.dim(`   Total events: ${result.thread.events.length}`));

  // Analyze the hierarchy execution
  const toolCalls = result.thread.events.filter(e => e.type === 'tool_call');
  const level1Calls = toolCalls.filter(e => e.data.intent.includes('coordinator')).length;
  const level2Calls = toolCalls.filter(e => 
    e.data.intent.includes('ask_') && 
    !e.data.intent.includes('coordinator')
  ).length;
  const level3Calls = toolCalls.filter(e => 
    !e.data.intent.includes('ask_') && 
    !e.data.intent.includes('coordinator')
  ).length;

  console.log(chalk.dim(`   Level 1 (Chief Ops) delegations: ${level1Calls}`));
  console.log(chalk.dim(`   Level 2 (Department) delegations: ${level2Calls}`));
  console.log(chalk.dim(`   Level 3 (Specialist) tool calls: ${level3Calls}`));

  console.log(chalk.cyan('\n🏢 Department Activity:'));
  const departments = ['sales', 'logistics', 'customer_service'];
  departments.forEach(dept => {
    const deptCalls = toolCalls.filter(e => 
      e.data.intent.toLowerCase().includes(dept.replace('_', ''))
    );
    if (deptCalls.length > 0) {
      console.log(chalk.dim(`   ${dept.replace('_', ' ').toUpperCase()}: ${deptCalls.length} operations`));
    }
  });
  
  console.log('\n');
}

main().catch(console.error);
