import OpenAI from 'openai';
import {
  LLMConnector,
  LLMOptions,
  LLMResponse,
  StreamChunk,
  ToolDefinition,
  ToolCall
} from '../types';

/**
 * OpenAI Response API Connector
 * Implements streaming with reasoning support (for o-series models)
 * Factor 1: Natural language to tool calls
 */
export class OpenAIConnector implements LLMConnector {
  private client: OpenAI;
  private defaultModel: string;

  constructor(options: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  }) {
    this.client = new OpenAI({
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      baseURL: options.baseURL || 'https://api.openai.com/v1'
    });
    this.defaultModel = options.model || 'gpt-5-mini';
  }

  /**
   * Determine next step without streaming
   */
  async determineNextStep(
    context: string | any[],
    tools: ToolDefinition[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const input = this.formatInput(context, options?.systemPrompt);
    const toolsFormatted = this.formatTools(tools);

    try {
      const response = await this.client.responses.create({
        model: options?.model || this.defaultModel,
        input,
        tools: toolsFormatted.length > 0 ? toolsFormatted : undefined,
        temperature: options?.temperature,
        max_output_tokens: options?.maxTokens,
        // Include reasoning for o-series models
        reasoning: this.isReasoningModel(options?.model || this.defaultModel) ? {
          effort: 'medium'
        } : undefined
      });

      return this.parseResponse(response);
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Stream next step with real-time updates
   * Shows reasoning as it happens for o-series models
   */
  async streamNextStep(
    context: string | any[],
    tools: ToolDefinition[],
    options?: LLMOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<LLMResponse> {
    const input = this.formatInput(context, options?.systemPrompt);
    const toolsFormatted = this.formatTools(tools);

    try {
      const stream = await this.client.responses.create({
        model: options?.model || this.defaultModel,
        input,
        tools: toolsFormatted.length > 0 ? toolsFormatted : undefined,
        temperature: options?.temperature,
        max_output_tokens: options?.maxTokens,
        stream: true,
        reasoning: this.isReasoningModel(options?.model || this.defaultModel) ? {
          effort: 'low'
        } : undefined
      });

      // Accumulate the response
      let fullResponse: any = null;
      let currentContent = '';
      let currentReasoning = '';
  let currentToolCall: Partial<ToolCall> | null = null;
      let currentFunctionName = '';
      let currentFunctionArgs = '';
  let toolCallEmitted = false;

      for await (const event of stream as any) {
        // Handle completed response
        if (event.type === 'response.completed' || event.type === 'response.done') {
          fullResponse = event.response;
        }

        if (event.type === 'response.reasoning_text.delta' || event.type === 'response.reasoning.delta') {
          const delta = event.delta || '';
          currentReasoning += delta;
          if (onChunk) {
            onChunk({
              type: 'reasoning',
              content: delta
            });
          }
        }

        // Handle reasoning completion events that may not emit deltas
        if (event.type === 'response.reasoning_text.done' && event.text) {
          const text = event.text || '';
          currentReasoning += text;
          if (onChunk) {
            onChunk({
              type: 'reasoning',
              content: text
            });
          }
        }

        // Handle reasoning summary deltas (alternative format)
        if (event.type === 'response.reasoning_summary_text.delta') {
          const delta = event.delta || '';
          currentReasoning += delta;
          if (onChunk) {
            onChunk({
              type: 'reasoning',
              content: delta
            });
          }
        }

        if (event.type === 'response.reasoning_summary_text.done' && event.text) {
          const text = event.text || '';
          currentReasoning += text;
          if (onChunk) {
            onChunk({
              type: 'reasoning',
              content: text
            });
          }
        }

        // Handle text output deltas
        if (event.type === 'response.output_text.delta') {
          const delta = event.delta || '';
          currentContent += delta;
          if (onChunk) {
            onChunk({
              type: 'content',
              content: delta
            });
          }
        }

        // Handle text completion events that may emit the full message without prior deltas
        // if (event.type === 'response.output_text.done' && event.text) {
        //   const text = event.text || '';
        //   currentContent += text;
        //   if (onChunk) {
        //     onChunk({
        //       type: 'content',
        //       content: text
        //     });
        //   }
        // }

        // Handle function call arguments delta
        if (event.type === 'response.function_call_arguments.delta') {
          currentFunctionArgs += event.delta || '';
        }

        // Handle function call completion
        // if (event.type === 'response.function_call_arguments.done') {
        //   if (event.arguments) {
        //     try {
        //       const parsedArgs = JSON.parse(event.arguments);
        //       const callId = event.item_id;

        //       currentToolCall = {
        //         intent: event.name || currentFunctionName,
        //         arguments: parsedArgs,
        //         callId
        //       };

        //       if (!toolCallEmitted && onChunk) {
        //         onChunk({
        //           type: 'tool_call',
        //           toolCall: currentToolCall
        //         });
        //         toolCallEmitted = true;
        //       }
        //     } catch (e) {
        //       console.error('Failed to parse function arguments:', event.arguments);
        //     }
        //   }
        // }

        // Handle output item added (this tells us when a function call starts)
        if (event.type === 'response.output_item.added') {
          const item = event.item;
          if (item && item.type === 'function_call') {
            currentFunctionName = item.name || '';
            currentFunctionArgs = '';
            currentToolCall = null;
            toolCallEmitted = false;
          }
        }

        // Handle output item completion (newer SDKs emit the full payload here)
        if (event.type === 'response.output_item.done') {
          const item = event.item;
          if (item && item.type === 'function_call') {
            const argsSource = item.arguments ?? currentFunctionArgs ?? '{}';
            let parsedArgs: Record<string, any> = {};

            if (typeof argsSource === 'string') {
              try {
                parsedArgs = argsSource ? JSON.parse(argsSource) : {};
              } catch (e) {
                console.error('Failed to parse function arguments:', argsSource);
              }
            } else if (typeof argsSource === 'object' && argsSource !== null) {
              parsedArgs = argsSource as Record<string, any>;
            }

            const callId = item.call_id || item.id;

            currentToolCall = {
              intent: item.name || currentFunctionName || 'unknown',
              arguments: parsedArgs,
              callId
            };

            if (!toolCallEmitted && onChunk) {
              onChunk({
                type: 'tool_call',
                toolCall: currentToolCall
              });
              toolCallEmitted = true;
            }
          }
        }
      }

      if (onChunk) {
        onChunk({ type: 'done' });
      }

      // Parse final response if we got one
      if (fullResponse) {
        const parsed = this.parseResponse(fullResponse);
        // Add accumulated reasoning if it's not in the parsed response
        if (currentReasoning && !parsed.reasoning) {
          parsed.reasoning = currentReasoning;
        }
        
        // If parseResponse defaulted to 'done' but we have accumulated content,
        // use the accumulated content instead
        if (parsed.type === 'done' && parsed.message === 'No further action needed.' && currentContent) {
          return {
            type: 'message',
            message: currentContent,
            reasoning: currentReasoning || undefined
          };
        }
        
        return parsed;
      }

      // Fallback: build response from accumulated deltas
      // If we have a tool call, return it
      if (currentToolCall && currentToolCall.intent) {
        return {
          type: 'tool_call',
          toolCall: currentToolCall as ToolCall,
          reasoning: currentReasoning || undefined
        };
      }

      // If we have content, return it as a message
      if (currentContent) {
        return {
          type: 'message',
          message: currentContent,
          reasoning: currentReasoning || undefined
        };
      }

      // If we only have reasoning, still return as done
      return {
        type: 'done',
        message: 'No output generated.',
        reasoning: currentReasoning || undefined
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Format input for the Response API
   */
  private formatInput(context: string | any[], systemPrompt?: string): any {
    // If context is already an array of messages, use it directly
    if (Array.isArray(context)) {
      // Add system prompt if provided
      if (systemPrompt) {
        return [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }]
          },
          ...context
        ];
      }
      return context;
    }

    // Otherwise, create a simple message structure
    if (systemPrompt) {
      return [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: String(context) }]
        }
      ];
    }

    return [
      {
        role: 'user',
        content: [{ type: 'input_text', text: String(context) }]
      }
    ];
  }

  /**
   * Format tools for OpenAI Response API
   * Factor 4: Tools are just structured outputs
   * 
   * Response API format requires both top-level name and function details
   */
  private formatTools(tools: ToolDefinition[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      name: tool.intent,
      function: {
        name: tool.intent,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Parse OpenAI response into our format
   */
  private parseResponse(response: any): LLMResponse {
    // Check for tool calls in output
    const output = response.output || [];
    
    for (const item of output) {
      if (item.type === 'function_call') {
        let args: Record<string, any> = {};
        const rawArgs = item.arguments;

        if (typeof rawArgs === 'string') {
          try {
            args = rawArgs ? JSON.parse(rawArgs) : {};
          } catch (e) {
            console.error('Failed to parse function arguments:', rawArgs);
          }
        } else if (typeof rawArgs === 'object' && rawArgs !== null) {
          args = rawArgs as Record<string, any>;
        }

        return {
          type: 'tool_call',
          toolCall: {
            intent: item.name,
            arguments: args,
            callId: item.call_id || item.id
          },
          raw: response
        };
      }

      if (item.type === 'message') {
        // Check for tool calls
        if (item.tool_calls && item.tool_calls.length > 0) {
          const toolCall = item.tool_calls[0];
          return {
            type: 'tool_call',
            toolCall: {
              intent: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
              callId: toolCall.id
            },
            raw: response
          };
        }

        // Regular message
        if (item.content && item.content.length > 0) {
          const textContent = item.content.find((c: any) => c.type === 'output_text');
          if (textContent) {
            return {
              type: 'message',
              message: textContent.text,
              raw: response
            };
          }
        }
      }

      // Reasoning content (o-series models)
      if (item.type === 'reasoning' && item.content) {
        // Reasoning is included but we continue to look for the actual output
        continue;
      }
    }

    // Extract reasoning if present
    let reasoning: string | undefined;
    const reasoningItem = output.find((item: any) => item.type === 'reasoning');
    if (reasoningItem && reasoningItem.content) {
      reasoning = reasoningItem.content;
    }

    // Fallback to aggregated output text if available
    if (response.output_text && typeof response.output_text === 'string') {
      return {
        type: 'message',
        message: response.output_text,
        reasoning,
        raw: response
      };
    }

    // Default to done if no clear next action
    return {
      type: 'done',
      message: 'No further action needed.',
      reasoning,
      raw: response
    };
  }

  /**
   * Check if the model supports reasoning
   */
  private isReasoningModel(model: string): boolean {
    return model.startsWith('o1') || 
           model.startsWith('o3') || 
           model.startsWith('gpt-5') ||
           model.includes('reasoning');
  }
}
