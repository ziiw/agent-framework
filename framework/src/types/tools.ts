import { ExecutionContext } from './context';

/**
 * Tool definition following Factor 4: Tools are just structured outputs
 */
export interface ToolDefinition {
  /** Unique tool identifier / intent */
  intent: string;

  /** Human-readable description */
  description: string;

  /** JSON schema for tool parameters */
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  /** Optional inline executor function - simplifies tool definition */
  execute?: (args: Record<string, any>, context?: ExecutionContext) => Promise<any>;
}

/**
 * Tool call - what the LLM wants to execute
 * Factor 4: Tools are structured outputs from the LLM
 */
export interface ToolCall {
  /** The tool to call */
  intent: string;

  /** Arguments for the tool */
  arguments: Record<string, any>;

  /** Optional call ID for tracking */
  callId?: string;
}

/**
 * Tool result - what happened when we executed the tool
 */
export interface ToolResult {
  /** The tool that was called */
  intent: string;

  /** Result data */
  data: any;

  /** Optional error if tool execution failed */
  error?: string;

  /** Corresponding call ID */
  callId?: string;
}

/**
 * Tool executor interface
 * Factor 4: Tools trigger deterministic code
 */
export interface ToolExecutor {
  /**
   * Execute a tool call and return the result
   */
  execute(toolCall: ToolCall): Promise<ToolResult>;

  /**
   * Check if this executor can handle the given tool
   */
  canHandle(intent: string): boolean;
}



