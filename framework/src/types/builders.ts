import { Thread } from './core';

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



