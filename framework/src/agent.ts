import {
  AgentConfig,
  AgentResult,
  Thread,
  ToolCall,
  ToolResult,
  LLMResponse,
  StreamChunk,
  ToolExecutor,
  ExecutionContext
} from './types';
import { ThreadManager } from './thread';
import { DefaultContextBuilder } from './context';

/**
 * Core Agent class
 * Factor 8: Own your control flow
 * Factor 12: Make your agent a stateless reducer
 * 
 * The agent is a pure function that takes a thread and produces a new thread
 */
export class Agent {
  private config: AgentConfig;
  private executorMap: Map<string, ToolExecutor>;

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      contextBuilder: config.contextBuilder || new DefaultContextBuilder(),
      toolExecutors: config.toolExecutors || [],
      controlFlow: {
        maxIterations: config.controlFlow?.maxIterations || 20,
        pauseOnIntents: config.controlFlow?.pauseOnIntents || [],
        ...config.controlFlow
      }
    };

    // Build executor map from both inline execute methods and separate executors
    this.executorMap = new Map();
    
    // First, create executors from tool definitions with inline execute methods
    for (const [key, tool] of Object.entries(this.config.tools)) {
      if (tool.execute) {
        const executeFn = tool.execute;
        const inlineExecutor: ToolExecutor = {
          canHandle: (intent: string) => intent === tool.intent,
          execute: async (toolCall: ToolCall): Promise<ToolResult> => {
            try {
              // Context will be enhanced with thread info when available
              const context: ExecutionContext = {
                agentName: this.config.name,
                metadata: {}
              };
              const data = await executeFn(toolCall.arguments, context);
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
        };
        this.executorMap.set(tool.intent, inlineExecutor);
      }
    }

    // Then, add/override with explicit toolExecutors if provided
    if (this.config.toolExecutors) {
      for (const executor of this.config.toolExecutors) {
        // Find which intent(s) this executor handles
        for (const tool of Object.values(this.config.tools)) {
          if (executor.canHandle(tool.intent)) {
            this.executorMap.set(tool.intent, executor);
          }
        }
      }
    }
  }

  /**
   * Run the agent with a new user message
   * Factor 6: Launch/Pause/Resume with simple APIs
   */
  async run(thread: Thread, message: string): Promise<AgentResult> {
    // Add user message to thread
    thread = ThreadManager.addEvent(thread, 'user_message', { message });
    
    // Reset thread status to active to allow processing
    if (thread.status !== 'active') {
      thread = ThreadManager.updateStatus(thread, 'active');
    }
    
    // Run the agent loop
    return this.resume(thread);
  }

  /**
   * Resume an existing thread
   * Factor 6: Launch/Pause/Resume with simple APIs
   */
  async resume(thread: Thread): Promise<AgentResult> {
    let iterations = 0;
    const maxIterations = this.config.controlFlow?.maxIterations || 20;

    while (iterations < maxIterations && thread.status === 'active') {
      iterations++;

      try {
        // Build context from thread
        const context = this.config.contextBuilder!.buildContext(thread);

        // Get available tools
        const tools = Object.values(this.config.tools);

        // Determine next step (without streaming for now)
        const response = await this.config.connector.determineNextStep(
          context,
          tools,
          {
            systemPrompt: this.config.systemPrompt,
            model: this.config.connector instanceof Object ? undefined : 'gpt-4o'
          }
        );

        // Handle the response
        const result = await this.handleResponse(thread, response);
        thread = result.thread;

        // Check if we should stop
        if (result.shouldStop) {
          return {
            thread,
            message: result.message,
            reason: result.reason || 'completed'
          };
        }

      } catch (error: any) {
        // Factor 9: Compact errors into context window
        thread = ThreadManager.addEvent(thread, 'error', {
          error: error.message,
          stack: error.stack
        });
        thread = ThreadManager.updateStatus(thread, 'error');

        return {
          thread,
          reason: 'error',
          error: error.message
        };
      }
    }

    // Max iterations reached
    thread = ThreadManager.updateStatus(thread, 'paused');
    return {
      thread,
      reason: 'max_iterations',
      message: 'Maximum iterations reached. Thread paused.'
    };
  }

  /**
   * Run with streaming support
   * Shows reasoning and tool calls in real-time
   */
  async streamRun(
    thread: Thread,
    message: string,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResult> {
    // Add user message to thread
    thread = ThreadManager.addEvent(thread, 'user_message', { message });

    // Reset thread status to active to allow processing
    if (thread.status !== 'active') {
      thread = ThreadManager.updateStatus(thread, 'active');
    }

    return this.streamResume(thread, onChunk);
  }

  /**
   * Resume with streaming
   */
  async streamResume(
    thread: Thread,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResult> {
    let iterations = 0;
    const maxIterations = this.config.controlFlow?.maxIterations || 20;

    while (iterations < maxIterations && thread.status === 'active') {
      iterations++;

      try {
        const context = this.config.contextBuilder!.buildContext(thread);
        const tools = Object.values(this.config.tools);

        // Stream the next step
        const response = await this.config.connector.streamNextStep(
          context,
          tools,
          {
            systemPrompt: this.config.systemPrompt
          },
          onChunk
        );

        // Handle the response
        const result = await this.handleResponse(thread, response);
        thread = result.thread;

        if (result.shouldStop) {
          return {
            thread,
            message: result.message,
            reason: result.reason || 'completed'
          };
        }

      } catch (error: any) {
        thread = ThreadManager.addEvent(thread, 'error', {
          error: error.message
        });
        thread = ThreadManager.updateStatus(thread, 'error');

        return {
          thread,
          reason: 'error',
          error: error.message
        };
      }
    }

    thread = ThreadManager.updateStatus(thread, 'paused');
    return {
      thread,
      reason: 'max_iterations'
    };
  }

  /**
   * Handle an LLM response
   * Factor 8: Own your control flow
   */
  private async handleResponse(
    thread: Thread,
    response: LLMResponse
  ): Promise<{
    thread: Thread;
    shouldStop: boolean;
    reason?: AgentResult['reason'];
    message?: string;
  }> {
    // Store reasoning if present
    if (response.reasoning) {
      thread = ThreadManager.addEvent(thread, 'reasoning', {
        content: response.reasoning
      });
    }

    // Handle different response types
    switch (response.type) {
      case 'done':
      case 'message':
        // Agent is done or gave a final message
        thread = ThreadManager.addEvent(thread, 'assistant_message', {
          message: response.message
        });
        thread = ThreadManager.updateStatus(thread, 'completed');
        
        return {
          thread,
          shouldStop: true,
          reason: 'completed',
          message: response.message
        };

      case 'tool_call':
        // Agent wants to call a tool
        if (!response.toolCall) {
          throw new Error('Tool call response missing toolCall data');
        }

        // Add tool call to thread
        thread = ThreadManager.addEvent(thread, 'tool_call', response.toolCall);

        // Check if this intent should pause execution
        // Factor 7: Contact humans with tools
        const shouldPause = this.config.controlFlow?.pauseOnIntents?.includes(
          response.toolCall.intent
        );

        if (shouldPause) {
          thread = ThreadManager.updateStatus(thread, 'paused');
          return {
            thread,
            shouldStop: true,
            reason: 'paused',
            message: `Paused for tool: ${response.toolCall.intent}`
          };
        }

        // Execute the tool
        const result = await this.executeTool(response.toolCall, thread);
        thread = ThreadManager.addEvent(thread, 'tool_result', result);

        // Check custom step handler
        if (this.config.controlFlow?.onStep) {
          const lastEvent = ThreadManager.getLastEvent(thread);
          const action = await this.config.controlFlow.onStep(lastEvent!);
          
          if (action === 'pause') {
            thread = ThreadManager.updateStatus(thread, 'paused');
            return { thread, shouldStop: true, reason: 'paused' };
          } else if (action === 'stop') {
            thread = ThreadManager.updateStatus(thread, 'completed');
            return { thread, shouldStop: true, reason: 'completed' };
          }
        }

        // Continue the loop
        return { thread, shouldStop: false };

      default:
        throw new Error(`Unknown response type: ${response.type}`);
    }
  }

  /**
   * Execute a tool call
   * Factor 4: Tools are just structured outputs that trigger deterministic code
   */
  private async executeTool(toolCall: ToolCall, thread: Thread): Promise<ToolResult> {
    // Find an executor that can handle this tool
    const executor = this.executorMap.get(toolCall.intent);

    if (executor) {
      return executor.execute(toolCall);
    }

    // No executor found - return error result
    return {
      intent: toolCall.intent,
      data: null,
      error: `No executor found for tool: ${toolCall.intent}`,
      callId: toolCall.callId
    };
  }

  /**
   * Get the agent's name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get available tools
   */
  getTools(): typeof this.config.tools {
    return this.config.tools;
  }
}
