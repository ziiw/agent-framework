import { Event, Thread } from './types';

/**
 * Thread management utilities
 * Factor 5: Unify execution state and business state
 * Factor 12: Make your agent a stateless reducer
 */

export class ThreadManager {
  /**
   * Create a new thread
   */
  static create(metadata?: Record<string, any>): Thread {
    return {
      id: this.generateId(),
      events: [],
      metadata: metadata || {},
      status: 'active'
    };
  }

  /**
   * Add an event to a thread
   * This is your state reducer - thread + event = new thread
   */
  static addEvent<T>(thread: Thread, type: string, data: T, metadata?: Record<string, any>): Thread {
    const event: Event<T> = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      metadata
    };

    return {
      ...thread,
      events: [...thread.events, event]
    };
  }

  /**
   * Get events of a specific type
   */
  static getEventsByType(thread: Thread, type: string): Event[] {
    return thread.events.filter(e => e.type === type);
  }

  /**
   * Get the last event of a specific type
   */
  static getLastEvent(thread: Thread, type?: string): Event | undefined {
    if (!type) {
      return thread.events[thread.events.length - 1];
    }
    
    for (let i = thread.events.length - 1; i >= 0; i--) {
      if (thread.events[i].type === type) {
        return thread.events[i];
      }
    }
    
    return undefined;
  }

  /**
   * Update thread status
   */
  static updateStatus(thread: Thread, status: Thread['status']): Thread {
    return {
      ...thread,
      status
    };
  }

  /**
   * Serialize thread to JSON
   */
  static serialize(thread: Thread): string {
    return JSON.stringify(thread);
  }

  /**
   * Deserialize thread from JSON
   */
  static deserialize(json: string): Thread {
    return JSON.parse(json);
  }

  /**
   * Fork a thread at a specific event
   * Useful for creating branches or testing different paths
   */
  static fork(thread: Thread, beforeEventId?: string): Thread {
    let events = thread.events;
    
    if (beforeEventId) {
      const index = events.findIndex(e => e.id === beforeEventId);
      if (index !== -1) {
        events = events.slice(0, index);
      }
    }

    return {
      id: this.generateId(),
      events: [...events],
      metadata: { ...thread.metadata, forkedFrom: thread.id },
      status: 'active'
    };
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Compact the thread by removing or summarizing old events
   * Factor 9: Compact errors into context window
   */
  static compact(thread: Thread, options?: {
    keepLast?: number;
    removeTypes?: string[];
    summarize?: boolean;
  }): Thread {
    let events = thread.events;

    // Remove specific event types
    if (options?.removeTypes) {
      events = events.filter(e => !options.removeTypes!.includes(e.type));
    }

    // Keep only last N events
    if (options?.keepLast && events.length > options.keepLast) {
      events = events.slice(-options.keepLast);
    }

    return {
      ...thread,
      events,
      metadata: {
        ...thread.metadata,
        compacted: true,
        originalEventCount: thread.events.length
      }
    };
  }
}
