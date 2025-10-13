/**
 * Example: Using MCP (Model Context Protocol) with the Agent Framework
 * 
 * This example shows how to connect to MCP servers to provide tools to your agents.
 * MCP allows you to connect to external servers that provide tools, resources, and context.
 * 
 * Prerequisites:
 * - Install the MCP SDK: bun add @modelcontextprotocol/sdk
 * - Have an MCP server available (see examples below)
 * 
 * Common MCP Servers:
 * - Filesystem: npx -y @modelcontextprotocol/server-filesystem /path/to/directory
 * - GitHub: npx -y @modelcontextprotocol/server-github
 * - Puppeteer: npx -y @modelcontextprotocol/server-puppeteer
 * - Brave Search: npx -y @modelcontextprotocol/server-brave-search
 */

import { Agent } from '../src/agent';
import { ThreadManager } from '../src/thread';
import { OpenAIConnector } from '../src/connectors/openai';
import { OpenAIContextBuilder } from '../src/context';
import { MCPManager } from '../src/connectors/mcp-client';
import { MCPToolExecutor } from '../src/connectors/mcp-executor';

async function main() {
  console.log('🚀 MCP Agent Example\n');

  // Example 1: Connect to a local filesystem MCP server
  console.log('Example 1: Filesystem MCP Server');
  console.log('--------------------------------');
  
  const mcpManager = new MCPManager();
  
  try {
    // Connect to filesystem server
    // Note: You need to start the MCP server first:
    // npx -y @modelcontextprotocol/server-filesystem /tmp
    await mcpManager.addServer({
      name: 'filesystem',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    });
    
    console.log('✓ Connected to filesystem MCP server');
    
    // Get available tools from MCP server
    const mcpTools = mcpManager.getAllTools();
    console.log(`✓ Loaded ${Object.keys(mcpTools).length} tools from MCP servers`);
    console.log('Available tools:', Object.keys(mcpTools).join(', '));
    
    // Create agent with MCP tools
    const agent = new Agent({
      name: 'filesystem-agent',
      systemPrompt: `You are a helpful assistant that can work with the filesystem.
You have access to tools to read, write, and list files in the /tmp directory.
Always be helpful and explain what you're doing.`,
      tools: mcpTools,
      connector: new OpenAIConnector({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
      }),
      contextBuilder: new OpenAIContextBuilder(),
      toolExecutors: [new MCPToolExecutor(mcpManager)],
    });
    
    console.log('\n💬 Starting conversation...\n');
    
    // Create a thread and run the agent
    let thread = ThreadManager.create({ sessionType: 'chat' });
    
    // Example query
    const query = 'List the files in the directory';
    console.log(`User: ${query}\n`);
    
    const result = await agent.run(thread, query);
    
    console.log(`Assistant: ${result.message}\n`);
    console.log(`Status: ${result.reason}`);
    console.log(`Events in thread: ${result.thread.events.length}`);
    
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\nNote: Make sure you have the MCP server running first!');
    console.log('Example: npx -y @modelcontextprotocol/server-filesystem /tmp');
  } finally {
    // Clean up - disconnect from MCP servers
    await mcpManager.disconnectAll();
  }
  
  console.log('\n\n');
  
  // Example 2: Multiple MCP Servers
  console.log('Example 2: Multiple MCP Servers');
  console.log('--------------------------------');
  console.log('You can connect to multiple MCP servers simultaneously:');
  console.log(`
const mcpManager = new MCPManager();

// Connect to filesystem server
await mcpManager.addServer({
  name: 'filesystem',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
});

// Connect to GitHub server
await mcpManager.addServer({
  name: 'github',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN
  }
});

// All tools from both servers are now available
const allTools = mcpManager.getAllTools();
  `);
  
  console.log('\n');
  
  // Example 3: Remote MCP Server (SSE)
  console.log('Example 3: Remote MCP Server (SSE)');
  console.log('-----------------------------------');
  console.log('Connect to a remote MCP server via HTTP/SSE:');
  console.log(`
await mcpManager.addServer({
  name: 'remote-tools',
  type: 'sse',
  url: 'http://localhost:3000/sse',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
  `);
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };

