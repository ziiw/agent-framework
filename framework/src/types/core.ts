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



