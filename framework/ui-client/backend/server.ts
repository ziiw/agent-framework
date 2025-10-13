import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { Agent } from '../../src/agent';
import { ThreadManager } from '../../src/thread';
import { OpenAICompatibleConnector } from '../../src/connectors/openai-compatible';
import { OpenAIConnector } from '../../src/connectors/openai';
import { OpenAIContextBuilder } from '../../src/context';
import { Thread, StreamChunk, ToolDefinition } from '../../src/types';
import { MCPManager, MCPServerConfig } from '../../src/connectors/mcp-client';
import { MCPToolExecutor } from '../../src/connectors/mcp-executor';
import { createAgentHierarchy } from '../../src/utils/agent-tools';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store agents and threads in memory (in production, use a database)
interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  tools: Record<string, ToolDefinition>;
  connector: 'openai' | 'openai-compatible';
  model?: string;
  baseURL?: string;
  mcpServers?: MCPServerConfig[];
  subAgents?: AgentConfig[];
}

interface ThreadSession {
  thread: Thread;
  agentId: string;
}

const agents = new Map<string, { config: AgentConfig; agent: Agent; mcpManager?: MCPManager }>();
const threads = new Map<string, ThreadSession>();

// WebSocket connections
const wsClients = new Map<string, WebSocket>();

// Global MCP managers for each agent
const mcpManagers = new Map<string, MCPManager>();

// Helper to convert string functions to actual functions
function convertToolFunctions(tools: Record<string, any>): Record<string, ToolDefinition> {
  const convertedTools: Record<string, any> = {};
  
  for (const [key, tool] of Object.entries(tools)) {
    convertedTools[key] = {
      ...tool,
      execute: typeof tool.execute === 'string' 
        ? new Function('return ' + tool.execute)() 
        : tool.execute
    };
  }
  
  return convertedTools;
}

// Helper to create agent from config
async function createAgentFromConfig(config: AgentConfig): Promise<{ agent: Agent; mcpManager?: MCPManager }> {
  let connector;

  if (config.connector === 'openai-compatible') {
    connector = new OpenAICompatibleConnector({
      baseURL: config.baseURL || 'http://localhost:1234/v1',
      model: config.model || 'default-model'
    });
  } else {
    connector = new OpenAIConnector({
      apiKey: process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o'
    });
  }

  // Convert tool execute strings to functions
  const tools = convertToolFunctions(config.tools);

  // Create sub-agents if configured
  let subAgentTools: Record<string, ToolDefinition> = {};
  if (config.subAgents && config.subAgents.length > 0) {
    // Recursively create sub-agents
    const subAgents: Array<{ agent: Agent; options?: any }> = [];
    for (const subConfig of config.subAgents) {
      const { agent: subAgent } = await createAgentFromConfig(subConfig);
      subAgents.push({ agent: subAgent });
    }

    // Create delegation tools for sub-agents
    const hierarchy = createAgentHierarchy(subAgents);
    subAgentTools = hierarchy.tools;
  }

  // Merge sub-agent tools with existing tools
  Object.assign(tools, subAgentTools);

  // Set up MCP if configured
  let mcpManager: MCPManager | undefined;
  let mcpExecutor;

  if (config.mcpServers && config.mcpServers.length > 0) {
    mcpManager = new MCPManager();

    // Connect to all MCP servers
    for (const serverConfig of config.mcpServers) {
      try {
        await mcpManager.addServer(serverConfig);
        console.log(`✓ Connected to MCP server: ${serverConfig.name}`);
      } catch (error: any) {
        console.error(`✗ Failed to connect to MCP server ${serverConfig.name}:`, error.message);
      }
    }

    // Get all MCP tools and merge with existing tools
    const mcpTools = mcpManager.getAllTools();
    Object.assign(tools, mcpTools);

    // Create MCP executor
    mcpExecutor = new MCPToolExecutor(mcpManager);
  }

  const agent = new Agent({
    name: config.name,
    systemPrompt: config.systemPrompt,
    tools,
    connector,
    contextBuilder: new OpenAIContextBuilder(),
    toolExecutors: mcpExecutor ? [mcpExecutor] : undefined
  });

  return { agent, mcpManager };
}

// REST API Endpoints

// Get all agents
app.get('/api/agents', (req, res) => {
  const agentList = Array.from(agents.values()).map(({ config }) => ({
    id: config.id,
    name: config.name,
    systemPrompt: config.systemPrompt,
    toolCount: Object.keys(config.tools).length,
    connector: config.connector,
    model: config.model
  }));
  res.json(agentList);
});

// Create new agent
app.post('/api/agents', async (req, res) => {
  try {
    const config: AgentConfig = {
      id: Date.now().toString(),
      name: req.body.name,
      systemPrompt: req.body.systemPrompt,
      tools: req.body.tools || {},
      connector: req.body.connector || 'openai',
      model: req.body.model,
      baseURL: req.body.baseURL,
      mcpServers: req.body.mcpServers || [],
      subAgents: req.body.subAgents || []
    };

    const { agent, mcpManager } = await createAgentFromConfig(config);
    agents.set(config.id, { config, agent, mcpManager });

    // Get final tool count (including MCP tools and sub-agent tools)
    const finalToolCount = Object.keys(agent.getTools()).length;
    const subAgentCount = config.subAgents?.length || 0;

    res.json({
      success: true,
      agentId: config.id,
      agent: {
        id: config.id,
        name: config.name,
        toolCount: finalToolCount,
        subAgentCount,
        mcpServerCount: config.mcpServers?.length || 0
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get agent details
app.get('/api/agents/:id', (req, res) => {
  const agentData = agents.get(req.params.id);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json(agentData.config);
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
  const agentData = agents.get(req.params.id);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Disconnect MCP servers if any
  if (agentData.mcpManager) {
    await agentData.mcpManager.disconnectAll();
  }
  
  agents.delete(req.params.id);
  res.json({ success: true });
});

// Create new thread
app.post('/api/threads', (req, res) => {
  const agentId = req.body.agentId;
  if (!agents.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const thread = ThreadManager.create({ sessionType: 'chat' });
  const threadId = Date.now().toString();
  threads.set(threadId, { thread, agentId });

  res.json({ success: true, threadId });
});

// Get thread
app.get('/api/threads/:id', (req, res) => {
  const session = threads.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  res.json({
    threadId: req.params.id,
    agentId: session.agentId,
    eventCount: session.thread.events.length
  });
});

// Get MCP server status for an agent
app.get('/api/agents/:id/mcp-servers', (req, res) => {
  const agentData = agents.get(req.params.id);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  if (!agentData.mcpManager) {
    return res.json({ servers: [] });
  }
  
  const status = agentData.mcpManager.getServerStatus();
  res.json({ servers: status });
});

// Add MCP server to an existing agent
app.post('/api/agents/:id/mcp-servers', async (req, res) => {
  const agentData = agents.get(req.params.id);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  try {
    if (!agentData.mcpManager) {
      agentData.mcpManager = new MCPManager();
    }
    
    const serverConfig: MCPServerConfig = req.body;
    await agentData.mcpManager.addServer(serverConfig);
    
    res.json({ 
      success: true,
      message: `Connected to MCP server: ${serverConfig.name}`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Remove MCP server from an agent
app.delete('/api/agents/:id/mcp-servers/:serverName', async (req, res) => {
  const agentData = agents.get(req.params.id);
  if (!agentData) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  if (!agentData.mcpManager) {
    return res.status(404).json({ error: 'No MCP servers configured' });
  }
  
  try {
    await agentData.mcpManager.removeServer(req.params.serverName);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// WebSocket handling for streaming
wss.on('connection', (ws: WebSocket) => {
  const clientId = Date.now().toString();
  wsClients.set(clientId, ws);

  ws.on('message', async (data: string) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'run') {
        const { threadId, agentId, query } = message;

        // Get or create thread
        let session = threads.get(threadId);
        if (!session) {
          const thread = ThreadManager.create({ sessionType: 'chat' });
          session = { thread, agentId };
          threads.set(threadId, session);
        }

        // Get agent
        const agentData = agents.get(agentId);
        if (!agentData) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Agent not found'
          }));
          return;
        }

        // Run agent with streaming
        const result = await agentData.agent.streamRun(
          session.thread,
          query,
          (chunk: StreamChunk) => {
            ws.send(JSON.stringify({
              type: 'chunk',
              chunk
            }));
          }
        );

        // Update thread
        session.thread = result.thread;

        // Send completion
        ws.send(JSON.stringify({
          type: 'complete',
          result: {
            message: result.message,
            reason: result.reason,
            error: result.error
          }
        }));
      }
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId
  }));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Agent Framework UI Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for streaming`);
});

