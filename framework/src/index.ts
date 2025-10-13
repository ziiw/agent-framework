/**
 * Agent Framework
 * 
 * A production-ready framework for building AI agents following the 12-factor principles
 */

// Core types
export * from './types';

// Thread management
export { ThreadManager } from './thread';

// Context builders
export {
  DefaultContextBuilder,
  OpenAIContextBuilder,
  CompactContextBuilder
} from './context';

// Agent
export { Agent } from './agent';

// Connectors
export { OpenAIConnector } from './connectors/openai';
export { OpenAICompatibleConnector } from './connectors/openai-compatible';

// MCP Support
export { MCPClient, MCPManager, type MCPServerConfig } from './connectors/mcp-client';
export { MCPToolExecutor } from './connectors/mcp-executor';

// Utilities
export { ToolExecutorRegistry, FunctionToolExecutor } from './utils/tool-registry';
export { agentAsTool, createAgentHierarchy } from './utils/agent-tools';
export type { AgentAsToolOptions } from './utils/agent-tools';
