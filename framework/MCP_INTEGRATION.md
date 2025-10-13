# MCP (Model Context Protocol) Integration

This framework now supports the **Model Context Protocol (MCP)**, allowing agents to connect to external servers that provide tools, resources, and context.

## Overview

MCP enables your agents to:
- Connect to local MCP servers via stdio
- Connect to remote MCP servers via SSE (Server-Sent Events)
- Use tools provided by MCP servers seamlessly
- Manage multiple MCP server connections simultaneously

## Installation

The MCP SDK is included in the framework dependencies:

```bash
bun add @modelcontextprotocol/sdk
```

## Quick Start

### 1. Basic Usage (Programmatic)

```typescript
import { Agent } from './src/agent';
import { MCPManager } from './src/connectors/mcp-client';
import { MCPToolExecutor } from './src/connectors/mcp-executor';

// Create MCP manager
const mcpManager = new MCPManager();

// Connect to an MCP server
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
});

// Get tools from MCP servers
const mcpTools = mcpManager.getAllTools();

// Create agent with MCP tools
const agent = new Agent({
  name: 'my-agent',
  systemPrompt: 'You are a helpful assistant with filesystem access.',
  tools: mcpTools,
  connector: new OpenAIConnector({ apiKey: process.env.OPENAI_API_KEY }),
  contextBuilder: new OpenAIContextBuilder(),
  toolExecutors: [new MCPToolExecutor(mcpManager)],
});
```

### 2. Using the UI

1. Navigate to the UI at `http://localhost:3001`
2. Click "Create New Agent"
3. Select "MCP" from the tool types
4. Configure your MCP server:
   - **Name**: A unique identifier for the server
   - **Type**: `stdio` (local process) or `sse` (remote server)
   - For stdio:
     - Command: `npx` (or `node`, `python`, etc.)
     - Arguments: `-y @modelcontextprotocol/server-filesystem /path`
   - For SSE:
     - URL: `http://localhost:3000/sse`
5. Click "Add Server" to add more servers
6. Create the agent

## Connection Types

### stdio (Local Process)

Connect to MCP servers running as local processes:

```typescript
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  env: {
    // Optional environment variables
    API_KEY: 'your-api-key'
  }
});
```

### SSE (Remote Server)

Connect to MCP servers via HTTP/SSE:

```typescript
await mcpManager.addServer({
  name: 'remote-tools',
  type: 'sse',
  url: 'http://localhost:3000/sse',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
```

## Available MCP Servers

The MCP ecosystem includes many ready-to-use servers:

### Official MCP Servers

1. **Filesystem** - File operations
   ```bash
   npx -y @modelcontextprotocol/server-filesystem /path/to/directory
   ```

2. **GitHub** - Repository management
   ```bash
   GITHUB_PERSONAL_ACCESS_TOKEN=<token> npx -y @modelcontextprotocol/server-github
   ```

3. **Puppeteer** - Browser automation
   ```bash
   npx -y @modelcontextprotocol/server-puppeteer
   ```

4. **Brave Search** - Web search
   ```bash
   BRAVE_API_KEY=<key> npx -y @modelcontextprotocol/server-brave-search
   ```

5. **PostgreSQL** - Database queries
   ```bash
   DATABASE_URL=<url> npx -y @modelcontextprotocol/server-postgres
   ```

6. **Slack** - Messaging integration
   ```bash
   SLACK_BOT_TOKEN=<token> npx -y @modelcontextprotocol/server-slack
   ```

### Community MCP Servers

Many community-built MCP servers are available. Search for "mcp-server" on npm or GitHub.

## Multiple Servers

You can connect to multiple MCP servers simultaneously:

```typescript
const mcpManager = new MCPManager();

// Connect to multiple servers
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
});

await mcpManager.addServer({
  name: 'github',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN }
});

await mcpManager.addServer({
  name: 'search',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY }
});

// All tools from all servers are now available
const allTools = mcpManager.getAllTools();
console.log(`Total tools: ${Object.keys(allTools).length}`);
```

## How It Works

### Tool Naming

Tools from MCP servers are automatically prefixed with the server name:

```
filesystem:read_file
filesystem:write_file
github:create_issue
github:list_repos
search:brave_web_search
```

### Tool Execution

When the agent wants to use an MCP tool:
1. The agent calls the tool with the full name (e.g., `filesystem:read_file`)
2. The `MCPToolExecutor` identifies which MCP server handles this tool
3. The tool call is forwarded to the appropriate MCP server
4. The result is returned to the agent

### Tool Discovery

Tools are discovered automatically when connecting to an MCP server:

```typescript
// Connect to server
await mcpManager.addServer(config);

// Tools are immediately available
const tools = mcpManager.getAllTools();
```

## API Reference

### MCPManager

```typescript
class MCPManager {
  // Add a new MCP server connection
  async addServer(config: MCPServerConfig): Promise<MCPClient>
  
  // Remove a server connection
  async removeServer(name: string): Promise<void>
  
  // Get all connected clients
  getClients(): MCPClient[]
  
  // Get a specific client
  getClient(name: string): MCPClient | undefined
  
  // Get all tools from all servers
  getAllTools(): Record<string, ToolDefinition>
  
  // Execute a tool call
  async executeTool(toolCall: ToolCall): Promise<ToolResult>
  
  // Disconnect all servers
  async disconnectAll(): Promise<void>
  
  // Get status of all servers
  getServerStatus(): Array<{
    name: string;
    connected: boolean;
    toolCount: number;
  }>
}
```

### MCPServerConfig

```typescript
interface MCPServerConfig {
  name: string;                    // Unique server identifier
  type: 'stdio' | 'sse';          // Connection type
  
  // For stdio
  command?: string;                // Command to execute
  args?: string[];                 // Command arguments
  env?: Record<string, string>;   // Environment variables
  
  // For SSE
  url?: string;                    // Server URL
  headers?: Record<string, string>; // HTTP headers
}
```

## Backend API Endpoints

### Get MCP Server Status

```http
GET /api/agents/:id/mcp-servers
```

Response:
```json
{
  "servers": [
    {
      "name": "filesystem",
      "connected": true,
      "toolCount": 5
    }
  ]
}
```

### Add MCP Server

```http
POST /api/agents/:id/mcp-servers
Content-Type: application/json

{
  "name": "filesystem",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
}
```

### Remove MCP Server

```http
DELETE /api/agents/:id/mcp-servers/:serverName
```

## Examples

See the complete example at:
```
framework/examples/mcp-agent-example.ts
```

Run it with:
```bash
bun run examples/mcp-agent-example.ts
```

## Troubleshooting

### Connection Fails

1. **stdio servers**: Make sure the command is executable and the MCP server package is installed
2. **SSE servers**: Verify the URL is correct and the server is running
3. Check console logs for detailed error messages

### No Tools Available

1. Verify the MCP server is running and accessible
2. Check that the server implements the MCP protocol correctly
3. Use `mcpManager.getServerStatus()` to check connection status

### Tool Execution Fails

1. Check that tool arguments match the expected schema
2. Verify the MCP server is still connected
3. Look for error messages in the tool result

## Best Practices

1. **Clean Up**: Always disconnect from MCP servers when done:
   ```typescript
   await mcpManager.disconnectAll();
   ```

2. **Error Handling**: MCP connections can fail, always handle errors:
   ```typescript
   try {
     await mcpManager.addServer(config);
   } catch (error) {
     console.error('Failed to connect:', error);
   }
   ```

3. **Server Names**: Use descriptive names that indicate what the server provides:
   ```typescript
   // Good
   name: 'github-api'
   name: 'local-filesystem'
   
   // Not as clear
   name: 'server1'
   name: 'mcp'
   ```

4. **Environment Variables**: Store sensitive data in environment variables:
   ```typescript
   env: {
     API_KEY: process.env.GITHUB_TOKEN
   }
   ```

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)

