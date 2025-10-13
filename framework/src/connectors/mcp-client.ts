import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ToolDefinition, ToolCall, ToolResult } from '../types';

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  /** Server name/identifier */
  name: string;
  
  /** Connection type */
  type: 'stdio' | 'sse';
  
  /** For stdio: command to run */
  command?: string;
  
  /** For stdio: command arguments */
  args?: string[];
  
  /** For stdio: environment variables */
  env?: Record<string, string>;
  
  /** For SSE: server URL */
  url?: string;
  
  /** For SSE: additional headers */
  headers?: Record<string, string>;
}

/**
 * MCP Client for connecting to MCP servers
 * Provides tools from external MCP servers to agents
 */
export class MCPClient {
  private client: Client;
  private config: MCPServerConfig;
  private connected: boolean = false;
  private availableTools: ToolDefinition[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.client = new Client(
      {
        name: `agent-framework-mcp-client`,
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      let transport;

      if (this.config.type === 'stdio') {
        if (!this.config.command) {
          throw new Error('stdio transport requires command');
        }

        transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
          env: this.config.env,
        });
      } else if (this.config.type === 'sse') {
        if (!this.config.url) {
          throw new Error('sse transport requires url');
        }

        transport = new SSEClientTransport(
          new URL(this.config.url),
          this.config.headers
        );
      } else {
        throw new Error(`Unknown transport type: ${this.config.type}`);
      }

      await this.client.connect(transport);
      this.connected = true;

      // Fetch available tools
      await this.refreshTools();
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
      this.availableTools = [];
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  /**
   * Refresh the list of available tools from the server
   */
  async refreshTools(): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const response = await this.client.listTools();
      
      // Convert MCP tools to framework ToolDefinition format
      this.availableTools = response.tools.map((tool) => ({
        intent: `${this.config.name}:${tool.name}`,
        description: tool.description || '',
        parameters: tool.inputSchema as any || {
          type: 'object',
          properties: {},
        },
      }));
    } catch (error) {
      throw new Error(`Failed to fetch tools from MCP server: ${error}`);
    }
  }

  /**
   * Get available tools from this MCP server
   */
  getTools(): ToolDefinition[] {
    return this.availableTools;
  }

  /**
   * Execute a tool call on the MCP server
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    if (!this.connected) {
      return {
        intent: toolCall.intent,
        data: null,
        error: 'Not connected to MCP server',
        callId: toolCall.callId,
      };
    }

    try {
      // Extract the actual tool name (remove server prefix)
      const toolName = toolCall.intent.replace(`${this.config.name}:`, '');

      const response = await this.client.callTool({
        name: toolName,
        arguments: toolCall.arguments,
      });

      // MCP returns content array, extract the text
      const content = (response.content as any[])
        .map((item: any) => {
          if (item.type === 'text') {
            return item.text;
          } else if (item.type === 'image') {
            return `[Image: ${item.mimeType}]`;
          } else if (item.type === 'resource') {
            return `[Resource: ${item.resource?.uri}]`;
          }
          return '';
        })
        .join('\n');

      return {
        intent: toolCall.intent,
        data: {
          content,
          isError: response.isError,
          raw: response,
        },
        error: response.isError ? 'Tool execution failed' : undefined,
        callId: toolCall.callId,
      };
    } catch (error: any) {
      return {
        intent: toolCall.intent,
        data: null,
        error: error.message || 'Unknown error executing tool',
        callId: toolCall.callId,
      };
    }
  }

  /**
   * Check if this client can handle a given tool intent
   */
  canHandle(intent: string): boolean {
    return intent.startsWith(`${this.config.name}:`);
  }

  /**
   * Get the server name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * MCP Manager for managing multiple MCP server connections
 */
export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * Add an MCP server connection
   */
  async addServer(config: MCPServerConfig): Promise<MCPClient> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server "${config.name}" already exists`);
    }

    const client = new MCPClient(config);
    await client.connect();
    this.clients.set(config.name, client);
    return client;
  }

  /**
   * Remove an MCP server connection
   */
  async removeServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
  }

  /**
   * Get all MCP clients
   */
  getClients(): MCPClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get a specific client by name
   */
  getClient(name: string): MCPClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Get all tools from all connected MCP servers
   */
  getAllTools(): Record<string, ToolDefinition> {
    const tools: Record<string, ToolDefinition> = {};
    
    for (const client of this.clients.values()) {
      for (const tool of client.getTools()) {
        tools[tool.intent] = tool;
      }
    }
    
    return tools;
  }

  /**
   * Execute a tool call on the appropriate MCP server
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    // Find the client that can handle this intent
    for (const client of this.clients.values()) {
      if (client.canHandle(toolCall.intent)) {
        return await client.executeTool(toolCall);
      }
    }

    return {
      intent: toolCall.intent,
      data: null,
      error: `No MCP server found for tool: ${toolCall.intent}`,
      callId: toolCall.callId,
    };
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map((client) =>
      client.disconnect()
    );
    await Promise.all(promises);
    this.clients.clear();
  }

  /**
   * Get server status for all clients
   */
  getServerStatus(): Array<{
    name: string;
    connected: boolean;
    toolCount: number;
  }> {
    return Array.from(this.clients.values()).map((client) => ({
      name: client.getName(),
      connected: client.isConnected(),
      toolCount: client.getTools().length,
    }));
  }
}

