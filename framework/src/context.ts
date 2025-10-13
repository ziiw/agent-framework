import { Thread, ContextBuilder } from './types';

/**
 * Default context builder using custom XML-like format
 * Factor 3: Own your context window
 * 
 * This builds context in a token-efficient format that's easy for LLMs to parse
 */
export class DefaultContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): string {
    const parts: string[] = [];

    // Add a header with thread info
    parts.push(`<thread id="${thread.id}" status="${thread.status}">`);

    // Convert each event to a context block
    for (const event of thread.events) {
      parts.push(this.eventToContext(event));
    }

    parts.push('</thread>');
    parts.push('\nWhat should the next step be?');

    return parts.join('\n\n');
  }

  /**
   * Convert a single event to context format
   */
  private eventToContext(event: any): string {
    const data = typeof event.data === 'string'
      ? event.data
      : this.formatData(event.data);

    return `<${event.type} id="${event.id}" timestamp="${event.timestamp}">
${data}
</${event.type}>`;
  }

  /**
   * Format data as YAML-like structure
   */
  private formatData(data: any, indent: number = 0): string {
    if (data === null || data === undefined) {
      return 'null';
    }

    if (typeof data !== 'object') {
      return String(data);
    }

    if (Array.isArray(data)) {
      return data.map(item =>
        '  '.repeat(indent) + '- ' + this.formatData(item, indent + 1)
      ).join('\n');
    }

    return Object.entries(data)
      .map(([key, value]) => {
        const spaces = '  '.repeat(indent);
        if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:\n${this.formatData(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${value}`;
      })
      .join('\n');
  }
}

/**
 * OpenAI message-based context builder
 * Uses the standard OpenAI chat format (compatible with Response API input parameter)
 * 
 * Note: The Response API accepts an input parameter that can be an array of messages.
 * For tool results, the Response API doesn't use the 'tool' role - instead, tool
 * results should be formatted as user messages or the model response should include
 * the tool calls in the output which gets passed to the next call via previous_response_id.
 */
export class OpenAIContextBuilder implements ContextBuilder {
  buildContext(thread: Thread): any[] {
    const messages: any[] = [];

    for (const event of thread.events) {
      switch (event.type) {
        case 'user_message':
          messages.push({
            role: 'user',
            content: [{
              type: 'input_text',
              text: String(event.data.message || event.data)
            }]
          });
          break;

        case 'assistant_message':
          messages.push({
            role: 'assistant',
            content: [{
              type: 'output_text',
              text: String(event.data.message || event.data)
            }]
          });
          break;

        case 'tool_call':
          messages.push({
            role: 'assistant',
            content: [{
              type: 'output_text',
              text: `Tool call requested: ${event.data.intent} with args ${JSON.stringify(event.data.arguments ?? {})}`
            }]
          });
          break;

        case 'tool_result':
          // For Response API compatibility, format tool results as user messages
          // The Response API doesn't support the 'tool' role in input
          const resultData = event.data.error
            ? { error: event.data.error }
            : event.data.data;

          messages.push({
            role: 'user',
            content: [{
              type: 'input_text',
              text: `Tool result for ${event.data.intent}: ${JSON.stringify(resultData)}`
            }]
          });
          break;

        case 'error':
          messages.push({
            role: 'user',
            content: [{
              type: 'input_text',
              text: `Error occurred: ${event.data.error || event.data}`
            }]
          });
          break;
      }
    }

    return messages;
  }
}

/**
 * Compact context builder that focuses on essential information
 * Factor 9: Compact errors into context window
 */
export class CompactContextBuilder implements ContextBuilder {
  private maxEvents: number;
  private priorityTypes: string[];

  constructor(options?: { maxEvents?: number; priorityTypes?: string[] }) {
    this.maxEvents = options?.maxEvents || 50;
    this.priorityTypes = options?.priorityTypes || ['user_message', 'tool_result', 'error'];
  }

  buildContext(thread: Thread): string {
    // Separate priority and non-priority events
    const priorityEvents = thread.events.filter(e => this.priorityTypes.includes(e.type));
    const otherEvents = thread.events.filter(e => !this.priorityTypes.includes(e.type));

    // Keep all priority events and fill up to maxEvents with others
    const selectedEvents = [
      ...priorityEvents,
      ...otherEvents.slice(-Math.max(0, this.maxEvents - priorityEvents.length))
    ].sort((a, b) => a.timestamp - b.timestamp);

    const parts: string[] = [];
    parts.push(`<thread id="${thread.id}" events="${selectedEvents.length}/${thread.events.length}">`);

    for (const event of selectedEvents) {
      parts.push(`<${event.type}>${this.summarizeData(event.data)}</${event.type}>`);
    }

    parts.push('</thread>');
    return parts.join('\n');
  }

  private summarizeData(data: any): string {
    if (typeof data === 'string') {
      return data.length > 200 ? data.substring(0, 197) + '...' : data;
    }
    const str = JSON.stringify(data);
    return str.length > 200 ? str.substring(0, 197) + '...' : str;
  }
}
