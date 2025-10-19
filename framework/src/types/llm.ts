import { Thread } from './core';
import { ToolDefinition, ToolCall } from './tools';

/**
 * Streaming chunk
 */
export interface StreamChunk {
  type: 'reasoning' | 'content' | 'tool_call' | 'done';
  content?: string;
  toolCall?: Partial<ToolCall>;
}

/**
 * LLM Options
 */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  [key: string]: any;
}

/**
 * LLM Response - what the model decided to do
 */
export interface LLMResponse {
  /** Type of response */
  type: 'tool_call' | 'message' | 'done';

  /** Tool call if type is 'tool_call' */
  toolCall?: ToolCall;

  /** Message content if type is 'message' or 'done' */
  message?: string;

  /** Reasoning content (for o-series models) */
  reasoning?: string;

  /** Raw response from the LLM */
  raw?: any;
}

/**
 * LLM Connector interface
 * Factor 1: Natural language to tool calls
 */
export interface LLMConnector {
  /**
   * Determine the next step given the current context
   * Returns either a tool call or a completion message
   */
  determineNextStep(
    context: string | any[],
    tools: ToolDefinition[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * Stream the next step with real-time updates
   * Factor: Show reasoning via streaming
   */
  streamNextStep(
    context: string | any[],
    tools: ToolDefinition[],
    options?: LLMOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<LLMResponse>;
}



