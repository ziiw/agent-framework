import { ToolExecutor, ToolCall, ToolResult } from '../types';

/**
 * Tool Executor Registry
 * Manages multiple tool executors
 */
export class ToolExecutorRegistry implements ToolExecutor {
  private executors: Map<string, ToolExecutor> = new Map();

  /**
   * Register a tool executor for a specific intent
   */
  register(intent: string, executor: ToolExecutor): void {
    this.executors.set(intent, executor);
  }

  /**
   * Register multiple executors at once
   */
  registerMany(executors: Record<string, ToolExecutor>): void {
    for (const [intent, executor] of Object.entries(executors)) {
      this.register(intent, executor);
    }
  }

  /**
   * Check if we can handle this intent
   */
  canHandle(intent: string): boolean {
    return this.executors.has(intent);
  }

  /**
   * Execute a tool call
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const executor = this.executors.get(toolCall.intent);
    
    if (!executor) {
      return {
        intent: toolCall.intent,
        data: null,
        error: `No executor registered for: ${toolCall.intent}`,
        callId: toolCall.callId
      };
    }

    return executor.execute(toolCall);
  }
}

/**
 * Simple function-based tool executor
 * Wraps a simple async function as a tool executor
 */
export class FunctionToolExecutor implements ToolExecutor {
  constructor(
    private intent: string,
    private fn: (args: any) => Promise<any>
  ) {}

  canHandle(intent: string): boolean {
    return intent === this.intent;
  }

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const data = await this.fn(toolCall.arguments);
      return {
        intent: toolCall.intent,
        data,
        callId: toolCall.callId
      };
    } catch (error: any) {
      return {
        intent: toolCall.intent,
        data: null,
        error: error.message,
        callId: toolCall.callId
      };
    }
  }
}
