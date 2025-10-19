import { StreamChunk } from './llm';

/**
 * Execution context passed to tool executors
 * Provides information about the current execution environment
 */
export interface ExecutionContext {
  /** Name of the agent executing the tool */
  agentName?: string;

  /** ID of the thread this tool is executing in */
  threadId?: string;

  /** User identifier if available */
  userId?: string;

  /** Session identifier if available */
  sessionId?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Streaming callback for sub-agents to stream to parent */
  onChunk?: (chunk: StreamChunk) => void;
}
