import { ToolExecutor, ToolCall, ToolResult } from '../types';
import { MCPManager } from './mcp-client';

/**
 * Tool executor that delegates to MCP servers
 */
export class MCPToolExecutor implements ToolExecutor {
  private mcpManager: MCPManager;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
  }

  /**
   * Check if this executor can handle the given intent
   * MCP intents are prefixed with the server name (e.g., "server:tool_name")
   */
  canHandle(intent: string): boolean {
    // Check if any MCP client can handle this intent
    for (const client of this.mcpManager.getClients()) {
      if (client.canHandle(intent)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Execute a tool call by delegating to the appropriate MCP server
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    return await this.mcpManager.executeTool(toolCall);
  }
}

