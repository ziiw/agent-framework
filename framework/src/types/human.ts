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



