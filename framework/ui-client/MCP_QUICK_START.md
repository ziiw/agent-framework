# MCP Quick Start Guide

## What is MCP?

**Model Context Protocol (MCP)** is an open protocol that allows AI agents to connect to external servers that provide:
- **Tools**: Functions the agent can call (e.g., file operations, API calls, database queries)
- **Resources**: Data sources the agent can read
- **Prompts**: Pre-configured prompt templates

## Why Use MCP?

1. **Extensibility**: Connect your agents to any MCP-compatible server
2. **Reusability**: Use existing MCP servers from the community
3. **Standardization**: MCP is an open standard supported by many tools
4. **Flexibility**: Run local servers or connect to remote ones

## Getting Started

### Step 1: Choose an MCP Server

Popular MCP servers include:

#### Filesystem
Access local files and directories:
```bash
npx -y @modelcontextprotocol/server-filesystem /path/to/directory
```

#### GitHub
Manage GitHub repositories:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=<token> npx -y @modelcontextprotocol/server-github
```

#### Brave Search
Perform web searches:
```bash
BRAVE_API_KEY=<key> npx -y @modelcontextprotocol/server-brave-search
```

#### PostgreSQL
Query databases:
```bash
DATABASE_URL=<url> npx -y @modelcontextprotocol/server-postgres
```

### Step 2: Create an Agent with MCP

#### Using the UI

1. Start the UI server:
   ```bash
   cd ui-client/backend
   bun run server.ts
   ```

2. Open http://localhost:3001 in your browser

3. Click "Create New Agent"

4. Fill in basic info:
   - Name: "My MCP Agent"
   - System Prompt: "You are a helpful assistant with access to external tools"
   - Select your connector and model

5. Under "Tools", select **MCP**

6. Configure your MCP server:
   - **Server Name**: `filesystem` (or any unique name)
   - **Connection Type**: `stdio` (for local) or `sse` (for remote)
   - **Command**: `npx` (for stdio)
   - **Arguments**: `-y @modelcontextprotocol/server-filesystem /tmp`
   - Click "Add Server"

7. Add more servers if needed

8. Click "Create Agent"

#### Programmatically

```typescript
import { Agent } from 'twelve-factor-agent-framework';
import { MCPManager, MCPToolExecutor } from 'twelve-factor-agent-framework';
import { OpenAIConnector, OpenAIContextBuilder } from 'twelve-factor-agent-framework';

// Create MCP manager
const mcpManager = new MCPManager();

// Add MCP servers
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
});

// Get tools from MCP
const tools = mcpManager.getAllTools();

// Create agent
const agent = new Agent({
  name: 'my-agent',
  systemPrompt: 'You are a helpful assistant.',
  tools,
  connector: new OpenAIConnector({ 
    apiKey: process.env.OPENAI_API_KEY 
  }),
  contextBuilder: new OpenAIContextBuilder(),
  toolExecutors: [new MCPToolExecutor(mcpManager)],
});

// Use the agent
let thread = ThreadManager.create({ sessionType: 'chat' });
const result = await agent.run(thread, 'List files in the directory');
```

### Step 3: Test Your Agent

Start a conversation with your agent and ask it to use the MCP tools:

**Example prompts:**

For filesystem MCP server:
- "List all files in the directory"
- "Read the contents of README.md"
- "Create a new file called test.txt with 'Hello World'"

For GitHub MCP server:
- "List my repositories"
- "Create a new issue in my-repo"
- "Show the latest commits"

For Brave Search:
- "Search the web for latest AI news"
- "Find information about MCP protocol"

## Connection Types

### stdio (Local Process)

Best for:
- Local development
- Private tools
- Fast connections

Configuration:
```typescript
{
  name: 'my-server',
  type: 'stdio',
  command: 'npx',  // or 'node', 'python', etc.
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  env: {
    API_KEY: 'optional-env-var'
  }
}
```

### SSE (Remote Server)

Best for:
- Shared tools
- Production deployments
- Scalability

Configuration:
```typescript
{
  name: 'my-server',
  type: 'sse',
  url: 'http://localhost:3000/sse',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
}
```

## Multiple MCP Servers

You can connect to multiple MCP servers simultaneously. Tools from all servers will be available to your agent:

```typescript
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

// Agent now has access to both filesystem AND GitHub tools
```

## Example Use Cases

### 1. Code Assistant
Combine filesystem + GitHub MCP servers to create an agent that can:
- Read and modify local files
- Create commits and PRs
- Search code repositories

### 2. Data Analyst
Combine PostgreSQL + filesystem MCP servers for an agent that can:
- Query databases
- Export results to CSV
- Generate reports

### 3. Research Assistant
Combine Brave Search + filesystem MCP servers for an agent that can:
- Search the web
- Download and save research papers
- Summarize findings

### 4. DevOps Agent
Combine multiple infrastructure MCP servers to:
- Monitor services
- Deploy applications
- Manage configurations

## Troubleshooting

### "Failed to connect to MCP server"

**For stdio:**
- Check that the command is correct and executable
- Verify the MCP server package is installed
- Ensure you have necessary permissions

**For SSE:**
- Verify the URL is correct
- Check that the server is running
- Test with curl: `curl -N http://localhost:3000/sse`

### "No tools available"

- Wait a moment after connecting (tool discovery takes time)
- Check server logs for errors
- Verify the server implements MCP protocol correctly
- Use `mcpManager.getServerStatus()` to check connection

### "Tool execution failed"

- Verify tool arguments match the expected schema
- Check that the MCP server is still connected
- Look at the error message in the tool result
- Check server logs for more details

## Resources

- **Full Documentation**: See [MCP_INTEGRATION.md](../MCP_INTEGRATION.md)
- **Example Code**: See [examples/mcp-agent-example.ts](../examples/mcp-agent-example.ts)
- **MCP Website**: https://modelcontextprotocol.io
- **MCP Servers**: https://github.com/modelcontextprotocol/servers
- **MCP Specification**: https://spec.modelcontextprotocol.io

## Next Steps

1. Try the example: `bun run example:mcp`
2. Explore available MCP servers
3. Create your own custom MCP server
4. Build multi-agent systems with MCP

## Need Help?

- Check the [MCP_INTEGRATION.md](../MCP_INTEGRATION.md) for detailed documentation
- Review the [examples](../examples/) directory
- Open an issue on GitHub
- Join the MCP community discussions

