/**
 * Core Types for the Agent Framework
 * 
 * Following Factor 5: Unify execution state and business state
 * Everything is an event, and the thread is the single source of truth
 */

/**
 * Base event structure - the fundamental unit of state
 * Factor 5: All state is unified as events in the thread
 */
export interface Event<T = any> {
  /** Unique identifier for this event */
  id: string;
  
  /** Type of event (e.g., 'user_message', 'tool_call', 'tool_result', 'error') */
  type: string;
  
  /** The event payload */
  data: T;
  
  /** When this event occurred */
  timestamp: number;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Thread represents the complete execution history
 * Factor 5: Single source of truth for all state
 */
export interface Thread {
  /** Unique identifier for this thread */
  id: string;
  
  /** All events that have occurred */
  events: Event[];
  
  /** Thread metadata (user info, session data, etc.) */
  metadata?: Record<string, any>;
  
  /** Current status of the thread */
  status: 'active' | 'paused' | 'completed' | 'error';
}

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
 * Context builder interface
 * Factor 3: Own your context window - build context however you want
 */
export interface ContextBuilder {
  /**
   * Convert a thread into a context string/format for the LLM
   * This is where you implement custom context engineering
   */
  buildContext(thread: Thread): string | any[];
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
 * Streaming chunk
 */
export interface StreamChunk {
  type: 'reasoning' | 'content' | 'tool_call' | 'done';
  content?: string;
  toolCall?: Partial<ToolCall>;
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

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent name */
  name: string;
  
  /** System prompt - Factor 2: Own your prompts */
  systemPrompt: string;
  
  /** Available tools */
  tools: Record<string, ToolDefinition>;
  
  /** LLM connector */
  connector: LLMConnector;
  
  /** Context builder - Factor 3: Own your context window */
  contextBuilder: ContextBuilder;
  
  /** Tool executors */
  toolExecutors?: ToolExecutor[];
  
  /** Control flow options - Factor 8: Own your control flow */
  controlFlow?: {
    /** Max iterations before forcing completion */
    maxIterations?: number;
    
    /** Intents that should pause the agent */
    pauseOnIntents?: string[];
    
    /** Custom step handler */
    onStep?: (event: Event) => Promise<'continue' | 'pause' | 'stop'>;
  };
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Final thread state */
  thread: Thread;
  
  /** Final message from the agent */
  message?: string;
  
  /** Why execution stopped */
  reason: 'completed' | 'paused' | 'max_iterations' | 'error';
  
  /** Error if execution failed */
  error?: string;
}

/**
 * Human-in-the-loop request
 * Factor 7: Contact humans with tools
 */
export interface HumanRequest {
  /** What we're asking the human */
  question: string;
  
  /** Context for the request */
  context?: any;
  
  /** Type of response needed */
  responseType?: 'approval' | 'input' | 'choice';
  
  /** Options for choice type */
  options?: string[];
}

/**
 * Human response
 */
export interface HumanResponse {
  /** The human's response */
  response: string | boolean;
  
  /** When they responded */
  timestamp: number;
}
