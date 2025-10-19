import { Thread, Event } from './core';
import { ToolDefinition, ToolExecutor } from './tools';
import { LLMConnector } from './llm';
import { ContextBuilder } from './builders';

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



