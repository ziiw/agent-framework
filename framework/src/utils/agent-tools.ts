import { ToolDefinition, ExecutionContext, StreamChunk } from '../types';
import { Agent } from '../agent';
import { ThreadManager } from '../thread';

/**
 * Options for converting an agent into a tool
 */
export interface AgentAsToolOptions {
  /** Custom intent name (defaults to use_{agent_name}) */
  intent?: string;
  
  /** Custom description (defaults to agent's system prompt) */
  description?: string;
  
  /** Additional parameters beyond the default 'query' parameter */
  parameters?: {
    additionalProperties?: Record<string, any>;
  };
  
  /** Maximum turns/iterations for sub-agent execution */
  maxTurns?: number;
  
  /** Whether to stream sub-agent output to parent's onChunk callback */
  streamToParent?: boolean;
  
  /** Whether to bubble up approval requests (pause state) to parent */
  bubbleApprovals?: boolean;
}

/**
 * Convert an agent into a tool definition with inline executor
 * This enables multi-agent composition where agents can use other agents as tools
 * 
 * Example:
 * ```typescript
 * const weatherAgent = new Agent({ ... });
 * const weatherTool = agentAsTool(weatherAgent, {
 *   description: 'Get weather information',
 *   streamToParent: true
 * });
 * 
 * const coordinatorAgent = new Agent({
 *   tools: {
 *     weather: weatherTool
 *   }
 * });
 * ```
 */
export function agentAsTool(
  agent: Agent,
  options: AgentAsToolOptions = {}
): ToolDefinition {
  const intent = options.intent || `use_${agent.getName().toLowerCase().replace(/\s+/g, '_')}`;
  
  // Build parameter schema
  const parameters: any = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The task, query, or instruction for the sub-agent'
      },
      ...(options.parameters?.additionalProperties || {})
    },
    required: ['query']
  };

  // Get a preview of the agent's capabilities from its system prompt
  const systemPromptPreview = agent.getTools() 
    ? `Can use tools: ${Object.keys(agent.getTools()).join(', ')}`
    : '';

  const defaultDescription = options.description || 
    `Delegate a task to ${agent.getName()}. ${systemPromptPreview}`;
  
  const descriptionWithExample = `${defaultDescription}

IMPORTANT: Always provide a 'query' parameter with a clear natural language instruction.
Example: { "query": "Your specific task or question here" }`;

  return {
    intent,
    description: descriptionWithExample,
    parameters,
    execute: async (args: any, context?: ExecutionContext) => {
      // Create a sub-thread for this agent execution
      const subThread = ThreadManager.create({
        sessionType: 'sub-agent',
        metadata: {
          parentAgent: context?.agentName,
          parentThreadId: context?.threadId,
          toolIntent: intent
        }
      });

      // Extract the query/instruction for the sub-agent
      // Try multiple common parameter names first
      let query = args.query || args.instruction || args.task || args.message || args.request;
      
      // If no query found, try to extract meaningful text from args
      if (!query) {
        // If args is a simple object with one string property, use that
        const keys = Object.keys(args);
        if (keys.length === 1 && typeof args[keys[0]] === 'string') {
          query = args[keys[0]];
        } else if (keys.length > 0) {
          // Try to construct a meaningful query from the args
          const stringValues = keys
            .filter(k => typeof args[k] === 'string' && args[k].length > 0)
            .map(k => `${k}: ${args[k]}`);
          
          if (stringValues.length > 0) {
            query = stringValues.join(', ');
          } else {
            // Last resort: use JSON but log a warning
            query = JSON.stringify(args);
            console.warn(`[agentAsTool:${intent}] No query parameter provided. Falling back to JSON.stringify. Args:`, args);
          }
        } else {
          // Empty args object
          query = 'No specific query provided';
          console.warn(`[agentAsTool:${intent}] Empty args object provided`);
        }
      }

      try {
        // Log the delegation for debugging
        if (process.env.DEBUG_AGENT_TOOLS === 'true') {
          console.log(`[agentAsTool:${intent}] Delegating to ${agent.getName()}`);
          console.log(`[agentAsTool:${intent}] Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);
          console.log(`[agentAsTool:${intent}] Args received:`, JSON.stringify(args, null, 2));
        }

        // Determine if we should stream to parent
        const onChunk = (options.streamToParent && context?.onChunk) 
          ? context.onChunk 
          : undefined;

        // Run the sub-agent with streaming if callback provided
        const result = onChunk
          ? await agent.streamRun(subThread, query, onChunk)
          : await agent.run(subThread, query);

        // Handle paused state (approval needed)
        if (result.reason === 'paused') {
          if (options.bubbleApprovals ?? true) {
            // Return structured data indicating pause
            return {
              status: 'paused',
              message: result.message || 'Sub-agent requires approval',
              subThreadId: subThread.id,
              requiresApproval: true,
              reason: 'paused'
            };
          }
          // If not bubbling, treat as error
          throw new Error(`Sub-agent paused: ${result.message}`);
        }

        // Handle errors
        if (result.reason === 'error') {
          return {
            status: 'error',
            error: result.error || 'Sub-agent execution failed',
            subThreadId: subThread.id,
            message: result.message,
            reason: 'error'
          };
        }

        // Handle max iterations
        if (result.reason === 'max_iterations') {
          return {
            status: 'max_iterations',
            message: result.message || 'Sub-agent reached maximum iterations',
            subThreadId: subThread.id,
            reason: 'max_iterations',
            partialResult: true
          };
        }

        // Return successful result
        return {
          status: 'completed',
          message: result.message,
          subThreadId: subThread.id,
          reason: result.reason,
          metadata: {
            turns: result.thread.events.filter(e => e.type === 'assistant_message').length,
            toolsCalled: result.thread.events.filter(e => e.type === 'tool_call').length,
            totalEvents: result.thread.events.length
          }
        };

      } catch (error: any) {
        // Return structured error instead of throwing
        return {
          status: 'error',
          error: error.message,
          subThreadId: subThread.id,
          stack: error.stack
        };
      }
    }
  };
}

/**
 * Helper to create multiple agent tools at once
 * Useful for building coordinator agents with multiple specialists
 * 
 * Example:
 * ```typescript
 * const { tools } = createAgentHierarchy([
 *   { agent: weatherAgent, options: { description: 'Weather info' } },
 *   { agent: mathAgent, options: { description: 'Math calculations' } }
 * ]);
 * 
 * const coordinator = new Agent({
 *   tools,
 *   ...
 * });
 * ```
 */
export function createAgentHierarchy(
  subAgents: Array<{ agent: Agent; options?: AgentAsToolOptions }>
): { tools: Record<string, ToolDefinition> } {
  const tools: Record<string, ToolDefinition> = {};

  for (const { agent, options } of subAgents) {
    const toolDef = agentAsTool(agent, options);
    tools[toolDef.intent] = toolDef;
  }

  return { tools };
}
