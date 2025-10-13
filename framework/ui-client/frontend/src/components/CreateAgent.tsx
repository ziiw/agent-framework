import { useState } from 'react';
import './CreateAgent.css';

interface CreateAgentProps {
  onSubmit: (agentData: any) => void;
  onCancel: () => void;
}

type ToolType = 'functions' | 'sales-agent' | 'infra-agent' | 'support-agent' | 'data-agent' | 'slack' | 'github' | 'stripe' | 'mcp' | 'direct' |
  'product-catalog' | 'pricing' | 'inventory' | 'shipping' | 'order-processing' | 'returns' | 'customer-account' | 'support-ticket' |
  'sales-coordinator' | 'logistics-coordinator' | 'customer-service-coordinator' | 'chief-operations';

// Agent hierarchy types
interface AgentNode {
  id: string;
  type: 'parent' | 'department' | 'specialist' | 'tool';
  name: string;
  systemPrompt: string;
  icon: string;
  children: AgentNode[];
  toolType?: ToolType;
  isExpanded?: boolean;
}

type ViewMode = 'builder' | 'templates' | 'advanced';

// Predefined E-Commerce Agent Configurations
const ecommerceAgentConfigs: Record<string, {
  name: string;
  systemPrompt: string;
  tools: any;
  description: string;
  icon: string;
}> = {
  'product-catalog': {
    name: 'Product Catalog Specialist',
    systemPrompt: 'You are a product catalog specialist for an e-commerce company. You manage product information, pricing, availability, and recommendations. Always provide accurate product details and suggest relevant alternatives when items are unavailable.',
    tools: {
      search_products: {
        intent: 'search_products',
        description: 'Search for products in the catalog',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { type: 'string', description: 'Product category filter' },
            max_price: { type: 'number', description: 'Maximum price filter' }
          },
          required: ['query']
        },
        execute: `async (args) => ({
          products: [
            { id: 'P001', name: 'Wireless Mouse', price: 29.99, stock: 150, category: 'Electronics' },
            { id: 'P002', name: 'Ergonomic Keyboard', price: 79.99, stock: 85, category: 'Electronics' },
            { id: 'P003', name: 'USB-C Hub', price: 49.99, stock: 220, category: 'Electronics' }
          ],
          query: args.query,
          total_results: 3
        })`
      },
      check_stock: {
        intent: 'check_stock',
        description: 'Check real-time stock availability for products',
        parameters: {
          type: 'object',
          properties: {
            product_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of product IDs to check'
            }
          },
          required: ['product_ids']
        },
        execute: `async (args) => ({
          stock_status: args.product_ids.map((id) => ({
            product_id: id,
            available: Math.random() > 0.2,
            quantity: Math.floor(Math.random() * 200) + 50,
            warehouse: ['NYC', 'LA', 'Chicago', 'Dallas'][Math.floor(Math.random() * 4)]
          }))
        })`
      }
    },
    description: 'Product catalog management & stock checking',
    icon: '📦'
  },
  'pricing': {
    name: 'Pricing Specialist',
    systemPrompt: 'You are a pricing and promotions specialist. You handle price calculations, discounts, promotional codes, and special offers. Always apply the best available discount for customers.',
    tools: {
      calculate_price: {
        intent: 'calculate_price',
        description: 'Calculate final price with discounts and promotions',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            quantity: { type: 'number' },
            promo_code: { type: 'string', description: 'Optional promotional code' }
          },
          required: ['product_id', 'quantity']
        },
        execute: `async (args) => {
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
        }`
      },
      validate_promo_code: {
        intent: 'validate_promo_code',
        description: 'Validate promotional codes',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string' }
          },
          required: ['code']
        },
        execute: `async (args) => ({
          valid: ['SAVE15', 'WELCOME20', 'FREESHIP'].includes(args.code.toUpperCase()),
          discount_percent: args.code.toUpperCase() === 'SAVE15' ? 15 : args.code.toUpperCase() === 'WELCOME20' ? 20 : 0,
          description: args.code.toUpperCase() === 'SAVE15' ? '15% off entire order' : 'Invalid code'
        })`
      }
    },
    description: 'Price calculations & promotional discounts',
    icon: '💰'
  },
  'inventory': {
    name: 'Inventory Specialist',
    systemPrompt: 'You are an inventory management specialist. You track stock levels, manage warehouse operations, and handle inventory transfers. Always ensure accurate inventory data and prevent stockouts.',
    tools: {
      check_warehouse_stock: {
        intent: 'check_warehouse_stock',
        description: 'Check stock levels across all warehouses',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string' },
            warehouse: { type: 'string', description: 'Optional specific warehouse' }
          },
          required: ['product_id']
        },
        execute: `async (args) => ({
          product_id: args.product_id,
          warehouses: [
            { location: 'NYC', quantity: 150, status: 'In Stock' },
            { location: 'LA', quantity: 200, status: 'In Stock' },
            { location: 'Chicago', quantity: 75, status: 'Low Stock' },
            { location: 'Dallas', quantity: 180, status: 'In Stock' }
          ],
          total_quantity: 605,
          recommended_warehouse: 'LA'
        })`
      },
      reserve_inventory: {
        intent: 'reserve_inventory',
        description: 'Reserve inventory for an order',
        parameters: {
          type: 'object',
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
        execute: `async (args) => ({
          order_id: args.order_id,
          reservation_id: \`RES-\${Date.now()}\`,
          reserved_items: args.items,
          warehouse: 'LA',
          expires_in_minutes: 15,
          status: 'Reserved'
        })`
      }
    },
    description: 'Warehouse inventory & stock management',
    icon: '🏭'
  },
  'shipping': {
    name: 'Shipping Specialist',
    systemPrompt: 'You are a shipping and delivery specialist. You calculate shipping costs, estimate delivery times, and track shipments. Always provide the most cost-effective and timely shipping options.',
    tools: {
      calculate_shipping: {
        intent: 'calculate_shipping',
        description: 'Calculate shipping costs and delivery estimates',
        parameters: {
          type: 'object',
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
        execute: `async (args) => {
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
        }`
      },
      track_shipment: {
        intent: 'track_shipment',
        description: 'Track shipment status',
        parameters: {
          type: 'object',
          properties: {
            tracking_number: { type: 'string' }
          },
          required: ['tracking_number']
        },
        execute: `async (args) => ({
          tracking_number: args.tracking_number,
          status: 'In Transit',
          current_location: 'Memphis, TN',
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          history: [
            { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), location: 'LA Warehouse', event: 'Package shipped' },
            { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), location: 'Phoenix, AZ', event: 'In transit' },
            { date: new Date().toISOString(), location: 'Memphis, TN', event: 'Arrived at sort facility' }
          ]
        })`
      }
    },
    description: 'Shipping calculations & delivery tracking',
    icon: '🚚'
  },
  'order-processing': {
    name: 'Order Processing Specialist',
    systemPrompt: 'You are an order processing specialist. You handle order creation, modifications, cancellations, and status checks. Always ensure orders are processed accurately and efficiently.',
    tools: {
      create_order: {
        intent: 'create_order',
        description: 'Create a new order',
        parameters: {
          type: 'object',
          properties: {
            customer_id: { type: 'string' },
            items: { type: 'array' },
            shipping_address: { type: 'object' }
          },
          required: ['customer_id', 'items']
        },
        execute: `async (args) => ({
          order_id: \`ORD-\${Date.now()}\`,
          customer_id: args.customer_id,
          items: args.items,
          status: 'Pending',
          created_at: new Date().toISOString(),
          estimated_ship_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })`
      },
      get_order_status: {
        intent: 'get_order_status',
        description: 'Get order status and details',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string' }
          },
          required: ['order_id']
        },
        execute: `async (args) => ({
          order_id: args.order_id,
          status: 'Shipped',
          tracking_number: 'TRK123456789',
          items: [
            { product_id: 'P001', name: 'Wireless Mouse', quantity: 2, price: 29.99 }
          ],
          total: 71.98,
          shipped_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        })`
      },
      cancel_order: {
        intent: 'cancel_order',
        description: 'Cancel an order if eligible',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['order_id']
        },
        execute: `async (args) => ({
          order_id: args.order_id,
          cancelled: true,
          refund_amount: 71.98,
          refund_method: 'Original payment method',
          estimated_refund_days: 5,
          cancellation_reason: args.reason || 'Customer request'
        })`
      }
    },
    description: 'Order creation, status checks & cancellations',
    icon: '📋'
  },
  'returns': {
    name: 'Returns Specialist',
    systemPrompt: 'You are a returns and refunds specialist. You handle return requests, generate return labels, and process refunds. Always provide excellent customer service and make returns easy.',
    tools: {
      initiate_return: {
        intent: 'initiate_return',
        description: 'Initiate a product return',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            items: { type: 'array' },
            reason: { type: 'string' }
          },
          required: ['order_id', 'items', 'reason']
        },
        execute: `async (args) => ({
          return_id: \`RET-\${Date.now()}\`,
          order_id: args.order_id,
          items: args.items,
          reason: args.reason,
          return_label_url: 'https://returns.example.com/label/RET123',
          return_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_refund_amount: 59.98,
          instructions: 'Pack items securely, attach prepaid label, drop off at any carrier location'
        })`
      },
      check_return_eligibility: {
        intent: 'check_return_eligibility',
        description: 'Check if items are eligible for return',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string' },
            item_ids: { type: 'array' }
          },
          required: ['order_id']
        },
        execute: `async (args) => ({
          order_id: args.order_id,
          eligible: true,
          days_remaining: 25,
          return_window_days: 30,
          conditions: ['Items must be unused', 'Original packaging required', 'All accessories included']
        })`
      }
    },
    description: 'Return requests & refund processing',
    icon: '↩️'
  },
  'customer-account': {
    name: 'Customer Account Specialist',
    systemPrompt: 'You are a customer account specialist. You manage customer profiles, preferences, order history, and loyalty programs. Always protect customer privacy and provide personalized service.',
    tools: {
      get_customer_info: {
        intent: 'get_customer_info',
        description: 'Get customer account information',
        parameters: {
          type: 'object',
          properties: {
            customer_id: { type: 'string' }
          },
          required: ['customer_id']
        },
        execute: `async (args) => ({
          customer_id: args.customer_id,
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          member_since: '2022-03-15',
          loyalty_tier: 'Gold',
          loyalty_points: 2450,
          total_orders: 23,
          lifetime_value: 1847.50,
          preferred_warehouse: 'LA'
        })`
      },
      get_order_history: {
        intent: 'get_order_history',
        description: 'Get customer order history',
        parameters: {
          type: 'object',
          properties: {
            customer_id: { type: 'string' },
            limit: { type: 'number', description: 'Number of recent orders' }
          },
          required: ['customer_id']
        },
        execute: `async (args) => ({
          customer_id: args.customer_id,
          orders: [
            { order_id: 'ORD-001', date: '2025-09-15', total: 129.99, status: 'Delivered' },
            { order_id: 'ORD-002', date: '2025-08-22', total: 89.99, status: 'Delivered' },
            { order_id: 'ORD-003', date: '2025-07-10', total: 199.99, status: 'Delivered' }
          ],
          total_orders: 23
        })`
      }
    },
    description: 'Customer profiles & loyalty programs',
    icon: '👤'
  },
  'support-ticket': {
    name: 'Support Ticket Specialist',
    systemPrompt: 'You are a support ticket specialist. You create, track, and resolve customer support tickets. Always document issues clearly and follow up promptly.',
    tools: {
      create_ticket: {
        intent: 'create_ticket',
        description: 'Create a customer support ticket',
        parameters: {
          type: 'object',
          properties: {
            customer_id: { type: 'string' },
            subject: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
          },
          required: ['customer_id', 'subject', 'description']
        },
        execute: `async (args) => ({
          ticket_id: \`TKT-\${Date.now()}\`,
          customer_id: args.customer_id,
          subject: args.subject,
          description: args.description,
          priority: args.priority || 'medium',
          status: 'Open',
          assigned_to: 'Support Team',
          created_at: new Date().toISOString(),
          sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })`
      },
      get_ticket_status: {
        intent: 'get_ticket_status',
        description: 'Get support ticket status',
        parameters: {
          type: 'object',
          properties: {
            ticket_id: { type: 'string' }
          },
          required: ['ticket_id']
        },
        execute: `async (args) => ({
          ticket_id: args.ticket_id,
          status: 'In Progress',
          priority: 'high',
          assigned_to: 'Senior Support Agent',
          last_update: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updates: [
            { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), message: 'Ticket created' },
            { date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), message: 'Assigned to specialist' }
          ]
        })`
      }
    },
    description: 'Support ticket creation & tracking',
    icon: '🎫'
  },
  'sales-coordinator': {
    name: 'Sales Coordinator',
    systemPrompt: 'You are the Sales Department Coordinator. You manage product catalog operations and pricing strategies. You coordinate between product catalog specialists and pricing specialists. Your responsibilities: Product search and recommendations, Stock availability checks, Price calculations and promotions, Product information and comparisons. Delegate tasks to: ProductCatalogSpecialist and PricingSpecialist. Always provide comprehensive responses that help close sales.',
    tools: {
      ask_product_catalog: {
        intent: 'ask_product_catalog',
        description: 'Delegate product catalog queries to the specialist. Use { "query": "search for wireless mouse" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Product catalog query delegated: " + args.query, status: "completed" })'
      },
      ask_pricing: {
        intent: 'ask_pricing',
        description: 'Delegate pricing and promotion queries to the specialist. Use { "query": "calculate price for product P001" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Pricing query delegated: " + args.query, status: "completed" })'
      }
    },
    description: 'Coordinates product catalog & pricing operations',
    icon: '👔'
  },
  'logistics-coordinator': {
    name: 'Logistics Coordinator',
    systemPrompt: 'You are the Logistics Department Coordinator. You oversee inventory management and shipping operations. You coordinate between inventory specialists and shipping specialists. Your responsibilities: Inventory tracking and management, Warehouse operations, Shipping cost calculations, Delivery tracking and estimates. Delegate tasks to: InventorySpecialist and ShippingSpecialist. Ensure efficient logistics operations and timely deliveries.',
    tools: {
      ask_inventory: {
        intent: 'ask_inventory',
        description: 'Delegate inventory management tasks to the specialist. Use { "query": "check warehouse stock for product P001" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Inventory query delegated: " + args.query, status: "completed" })'
      },
      ask_shipping: {
        intent: 'ask_shipping',
        description: 'Delegate shipping and delivery tasks to the specialist. Use { "query": "calculate shipping to 90210" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Shipping query delegated: " + args.query, status: "completed" })'
      }
    },
    description: 'Coordinates inventory & shipping operations',
    icon: '📈'
  },
  'customer-service-coordinator': {
    name: 'Customer Service Coordinator',
    systemPrompt: 'You are the Customer Service Department Coordinator. You oversee order processing, returns, account management, and support operations. You coordinate between multiple customer service specialists. Your responsibilities: Order management and processing, Return and refund handling, Customer account support, Support ticket management. Delegate tasks to: OrderProcessingSpecialist, ReturnsSpecialist, CustomerAccountSpecialist, and SupportTicketSpecialist. Always prioritize customer satisfaction and quick resolution.',
    tools: {
      ask_order_processing: {
        intent: 'ask_order_processing',
        description: 'Delegate order processing tasks to the specialist. Use { "query": "get order status for ORD-123" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Order processing query delegated: " + args.query, status: "completed" })'
      },
      ask_returns: {
        intent: 'ask_returns',
        description: 'Delegate return and refund tasks to the specialist. Use { "query": "initiate return for order ORD-123" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Returns query delegated: " + args.query, status: "completed" })'
      },
      ask_customer_account: {
        intent: 'ask_customer_account',
        description: 'Delegate customer account tasks to the specialist. Use { "query": "get loyalty points for CUST-12345" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Customer account query delegated: " + args.query, status: "completed" })'
      },
      ask_support_ticket: {
        intent: 'ask_support_ticket',
        description: 'Delegate support ticket tasks to the specialist. Use { "query": "create ticket for shipping issue" }',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        execute: 'async (args) => ({ response: "Support ticket query delegated: " + args.query, status: "completed" })'
      }
    },
    description: 'Coordinates customer service operations',
    icon: '🎧'
  },
};

// Predefined Templates for Quick Start
const hierarchyTemplates: Record<string, AgentNode> = {
  'ecommerce-full': {
    id: 'root',
    type: 'parent',
    name: 'E-Commerce Operations Manager',
    systemPrompt: 'You are a helpful assistant for an e-commerce platform. You coordinate all departments including Sales, Logistics, and Customer Service. Analyze requests and delegate to the appropriate department coordinator. Only use information from the answer of the tools',
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
      },
      {
        id: 'logistics-dept',
        type: 'department',
        name: 'Logistics Department',
        systemPrompt: 'You are the Logistics Department Coordinator. You oversee inventory management and shipping operations.',
        icon: '📈',
        isExpanded: false,
        toolType: 'logistics-coordinator',
        children: [
          {
            id: 'inventory',
            type: 'specialist',
            name: 'Inventory Specialist',
            systemPrompt: 'You are an inventory management specialist.',
            icon: '🏭',
            toolType: 'inventory',
            children: []
          },
          {
            id: 'shipping',
            type: 'specialist',
            name: 'Shipping Specialist',
            systemPrompt: 'You are a shipping and delivery specialist.',
            icon: '🚚',
            toolType: 'shipping',
            children: []
          }
        ]
      },
      {
        id: 'customer-service-dept',
        type: 'department',
        name: 'Customer Service Department',
        systemPrompt: 'You are the Customer Service Department Coordinator. You oversee order processing, returns, account management, and support operations.',
        icon: '🎧',
        isExpanded: false,
        toolType: 'customer-service-coordinator',
        children: [
          {
            id: 'order-processing',
            type: 'specialist',
            name: 'Order Processing Specialist',
            systemPrompt: 'You are an order processing specialist.',
            icon: '📋',
            toolType: 'order-processing',
            children: []
          },
          {
            id: 'returns',
            type: 'specialist',
            name: 'Returns Specialist',
            systemPrompt: 'You are a returns and refunds specialist.',
            icon: '↩️',
            toolType: 'returns',
            children: []
          },
          {
            id: 'customer-account',
            type: 'specialist',
            name: 'Customer Account Specialist',
            systemPrompt: 'You are a customer account specialist.',
            icon: '👤',
            toolType: 'customer-account',
            children: []
          },
          {
            id: 'support-ticket',
            type: 'specialist',
            name: 'Support Ticket Specialist',
            systemPrompt: 'You are a support ticket specialist.',
            icon: '🎫',
            toolType: 'support-ticket',
            children: []
          }
        ]
      }
    ]
  },
  'blank': {
    id: 'root',
    type: 'parent',
    name: 'New Agent',
    systemPrompt: 'You are a helpful assistant.',
    icon: '🤖',
    isExpanded: true,
    children: []
  }
};

export default function CreateAgent({ onSubmit, onCancel }: CreateAgentProps) {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  
  // Agent hierarchy state
  const [agentHierarchy, setAgentHierarchy] = useState<AgentNode>(hierarchyTemplates['blank']);
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  
  // Global configuration
  const [connector, setConnector] = useState<'openai' | 'openai-compatible'>('openai-compatible');
  const [model, setModel] = useState('ibm/granite-4-h-tiny');
  const [baseURL, setBaseURL] = useState('http://192.168.1.123:1234/v1');

  // Helper function to generate unique IDs
  const generateId = () => `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Load a template
  const loadTemplate = (templateKey: string) => {
    const template = hierarchyTemplates[templateKey];
    if (template) {
      setAgentHierarchy(JSON.parse(JSON.stringify(template))); // Deep clone
      setViewMode('builder');
    }
  };

  // Add a child node to a parent
  const addChildNode = (parentId: string, childType: 'department' | 'specialist' | 'tool') => {
    const newNode: AgentNode = {
      id: generateId(),
      type: childType,
      name: `New ${childType.charAt(0).toUpperCase() + childType.slice(1)}`,
      systemPrompt: '',
      icon: childType === 'department' ? '📁' : childType === 'specialist' ? '🔧' : '⚙️',
      children: [],
      isExpanded: false
    };

    const updateNode = (node: AgentNode): AgentNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode], isExpanded: true };
      }
      return { ...node, children: node.children.map(updateNode) };
    };

    setAgentHierarchy(updateNode(agentHierarchy));
  };

  // Add a specialist from template
  const addSpecialistFromTemplate = (parentId: string, toolType: ToolType) => {
    const config = ecommerceAgentConfigs[toolType];
    if (!config) return;

    const newNode: AgentNode = {
      id: generateId(),
      type: 'specialist',
      name: config.name,
      systemPrompt: config.systemPrompt,
      icon: config.icon,
      children: [],
      toolType: toolType,
      isExpanded: false
    };

    const updateNode = (node: AgentNode): AgentNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode], isExpanded: true };
      }
      return { ...node, children: node.children.map(updateNode) };
    };

    setAgentHierarchy(updateNode(agentHierarchy));
  };

  // Remove a node
  const removeNode = (nodeId: string) => {
    const updateNode = (node: AgentNode): AgentNode => {
      return {
        ...node,
        children: node.children.filter(child => child.id !== nodeId).map(updateNode)
      };
    };

    setAgentHierarchy(updateNode(agentHierarchy));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  // Update a node's properties
  const updateNodeProperties = (nodeId: string, updates: Partial<AgentNode>) => {
    const updateNode = (node: AgentNode): AgentNode => {
      if (node.id === nodeId) {
        const updated = { ...node, ...updates };
        if (selectedNode?.id === nodeId) {
          setSelectedNode(updated);
        }
        return updated;
      }
      return { ...node, children: node.children.map(updateNode) };
    };

    setAgentHierarchy(updateNode(agentHierarchy));
  };

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    const updateNode = (node: AgentNode): AgentNode => {
      if (node.id === nodeId) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      return { ...node, children: node.children.map(updateNode) };
    };

    setAgentHierarchy(updateNode(agentHierarchy));
  };

  // Find a node by ID
  const findNode = (nodeId: string, node: AgentNode = agentHierarchy): AgentNode | null => {
    if (node.id === nodeId) return node;
    for (const child of node.children) {
      const found = findNode(nodeId, child);
      if (found) return found;
    }
    return null;
  };

  // Convert hierarchy to agent configuration
  const convertHierarchyToConfig = (node: AgentNode): any => {
    const config: any = {
      name: node.name,
      systemPrompt: node.systemPrompt,
      connector,
      model,
      baseURL: connector === 'openai-compatible' ? baseURL : undefined,
      tools: {},
      subAgents: []
    };

    // Add tools from this node if it has a toolType
    if (node.toolType && ecommerceAgentConfigs[node.toolType]) {
      config.tools = ecommerceAgentConfigs[node.toolType].tools;
    }

    // Add sub-agents (the framework will automatically create delegation tools)
    if (node.children.length > 0) {
      config.subAgents = node.children.map(child => convertHierarchyToConfig(child));
    }

    return config;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const agentConfig = convertHierarchyToConfig(agentHierarchy);
      onSubmit(agentConfig);
    } catch (error) {
      alert('Error creating agent configuration');
      console.error(error);
    }
  };

  // Render a node in the hierarchy tree
  const renderNode = (node: AgentNode, depth: number = 0): JSX.Element => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children.length > 0;
    const canAddChildren = node.type !== 'specialist';

    return (
      <div key={node.id} className="hierarchy-node" style={{ marginLeft: `${depth * 20}px` }}>
        <div 
          className={`node-content ${isSelected ? 'selected' : ''} ${node.type}`}
          onClick={() => setSelectedNode(node)}
        >
          <div className="node-header">
            {hasChildren && (
              <button
                type="button"
                className="expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeExpansion(node.id);
                }}
              >
                {node.isExpanded ? '▼' : '▶'}
              </button>
            )}
            <span className="node-icon">{node.icon}</span>
            <span className="node-name">{node.name}</span>
            <span className="node-type-badge">{node.type}</span>
          </div>
          <div className="node-actions">
            {canAddChildren && (
              <div className="add-child-dropdown">
                <button type="button" className="icon-btn" title="Add child">
                  +
                </button>
                <div className="dropdown-menu">
                  {node.type === 'parent' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addChildNode(node.id, 'department');
                      }}
                    >
                      📁 Add Department
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addChildNode(node.id, 'specialist');
                    }}
                  >
                    🔧 Add Specialist
                  </button>
                  <div className="dropdown-divider">From Template:</div>
                  {Object.entries(ecommerceAgentConfigs).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addSpecialistFromTemplate(node.id, key as ToolType);
                      }}
                    >
                      {config.icon} {config.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {node.id !== 'root' && (
              <button
                type="button"
                className="icon-btn danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${node.name}?`)) {
                    removeNode(node.id);
                  }
                }}
                title="Delete"
              >
                ×
              </button>
            )}
          </div>
        </div>
        {node.isExpanded && hasChildren && (
          <div className="node-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="create-agent">
      <div className="create-agent-header">
        <h2>🤖 Agent Builder</h2>
        <div className="view-mode-tabs">
          <button
            className={viewMode === 'templates' ? 'active' : ''}
            onClick={() => setViewMode('templates')}
          >
            📋 Templates
          </button>
          <button
            className={viewMode === 'builder' ? 'active' : ''}
            onClick={() => setViewMode('builder')}
          >
            🎨 Builder
          </button>
          <button
            className={viewMode === 'advanced' ? 'active' : ''}
            onClick={() => setViewMode('advanced')}
          >
            ⚙️ Advanced
          </button>
        </div>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>

      <form onSubmit={handleSubmit} className="agent-form">
        
        {/* Templates View */}
        {viewMode === 'templates' && (
          <div className="templates-view">
            <div className="templates-header">
              <h3>Start with a Template</h3>
              <p>Choose a pre-built agent hierarchy or start from scratch</p>
            </div>
            
            <div className="templates-grid">
              <div 
                className="template-card featured"
                onClick={() => loadTemplate('ecommerce-full')}
              >
                <div className="template-icon">🏢</div>
                <h4>E-Commerce Platform</h4>
                <p>Complete e-commerce organization with Sales, Logistics, and Customer Service departments</p>
                <div className="template-stats">
                  <span>3 Departments</span>
                  <span>8 Specialists</span>
                </div>
                <button type="button" className="use-template-btn">Use Template</button>
              </div>

              <div 
                className="template-card"
                onClick={() => loadTemplate('blank')}
              >
                <div className="template-icon">🤖</div>
                <h4>Blank Agent</h4>
                <p>Start from scratch and build your own custom agent hierarchy</p>
                <div className="template-stats">
                  <span>Start Fresh</span>
                </div>
                <button type="button" className="use-template-btn">Start Building</button>
              </div>

              <div className="template-card disabled">
                <div className="template-icon">💼</div>
                <h4>SaaS Company</h4>
                <p>Coming soon: Sales, Support, and Engineering departments</p>
                <div className="template-badge">Coming Soon</div>
              </div>

              <div className="template-card disabled">
                <div className="template-icon">🏥</div>
                <h4>Healthcare</h4>
                <p>Coming soon: Patient Care, Scheduling, and Billing departments</p>
                <div className="template-badge">Coming Soon</div>
              </div>
            </div>
          </div>
        )}

        {/* Builder View */}
        {viewMode === 'builder' && (
          <div className="builder-view">
            <div className="builder-layout">
              {/* Left: Hierarchy Tree */}
              <div className="hierarchy-panel">
                <div className="panel-header">
                  <h3>🌳 Agent Hierarchy</h3>
                  <p>Click to select, + to add children</p>
                </div>
                <div className="hierarchy-tree">
                  {renderNode(agentHierarchy, 0)}
                </div>
              </div>

              {/* Right: Node Editor */}
              <div className="editor-panel">
                {selectedNode ? (
                  <>
                    <div className="panel-header">
                      <h3>✏️ Edit: {selectedNode.name}</h3>
                      <span className="node-type-badge">{selectedNode.type}</span>
                    </div>
                    
                    <div className="editor-content">
                      <div className="form-group">
                        <label>Icon</label>
                        <input
                          type="text"
                          value={selectedNode.icon}
                          onChange={(e) => updateNodeProperties(selectedNode.id, { icon: e.target.value })}
                          placeholder="🤖"
                          maxLength={2}
                        />
                      </div>

                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={selectedNode.name}
                          onChange={(e) => updateNodeProperties(selectedNode.id, { name: e.target.value })}
                          placeholder="Agent Name"
                        />
                      </div>

                      <div className="form-group">
                        <label>System Prompt</label>
                        <textarea
                          value={selectedNode.systemPrompt}
                          onChange={(e) => updateNodeProperties(selectedNode.id, { systemPrompt: e.target.value })}
                          placeholder="You are a helpful assistant..."
                          rows={8}
                        />
                        <small>Define the agent's role and behavior</small>
                      </div>

                      {selectedNode.toolType && ecommerceAgentConfigs[selectedNode.toolType] && (
                        <div className="agent-tools-info">
                          <h4>🛠️ Available Tools</h4>
                          <ul className="tools-list">
                            {Object.entries(ecommerceAgentConfigs[selectedNode.toolType].tools).map(([toolName, tool]: [string, any]) => (
                              <li key={toolName}>
                                <strong>{toolName}</strong>
                                <p>{tool.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedNode.children.length > 0 && (
                        <div className="children-info">
                          <h4>👥 Sub-Agents ({selectedNode.children.length})</h4>
                          <ul>
                            {selectedNode.children.map(child => (
                              <li key={child.id}>
                                {child.icon} {child.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="editor-placeholder">
                    <div className="placeholder-icon">👈</div>
                    <h3>Select a node to edit</h3>
                    <p>Click on any agent in the hierarchy to view and edit its properties</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advanced View */}
        {viewMode === 'advanced' && (
          <div className="advanced-view">
            <div className="form-row">
              <div className="form-group">
                <label>Connector</label>
                <select value={connector} onChange={(e) => setConnector(e.target.value as any)}>
                  <option value="openai">OpenAI</option>
                  <option value="openai-compatible">OpenAI Compatible</option>
                </select>
              </div>

              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o"
                  required
                />
              </div>
            </div>

            {connector === 'openai-compatible' && (
              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="text"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Agent Hierarchy Preview</label>
              <div className="hierarchy-preview-simple">
                {renderNode(agentHierarchy, 0)}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Create Agent
          </button>
        </div>
      </form>
    </div>
  );
}

