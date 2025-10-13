import { create } from 'zustand';

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  toolCount: number;
  connector: 'openai' | 'openai-compatible';
  model?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  reasoning?: string;
  toolCalls?: Array<{ intent: string; result?: any }>;
  timestamp: number;
}

interface AppState {
  agents: Agent[];
  selectedAgentId: string | null;
  messages: Message[];
  isConnected: boolean;
  isStreaming: boolean;
  currentReasoning: string;
  ws: WebSocket | null;
  threadId: string | null;

  // Actions
  setAgents: (agents: Agent[]) => void;
  selectAgent: (agentId: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setConnected: (connected: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setCurrentReasoning: (reasoning: string) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  setThreadId: (threadId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  agents: [],
  selectedAgentId: null,
  messages: [],
  isConnected: false,
  isStreaming: false,
  currentReasoning: '',
  ws: null,
  threadId: null,

  setAgents: (agents) => set({ agents }),
  selectAgent: (agentId) => set({ selectedAgentId: agentId, messages: [], threadId: null }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [], threadId: null }),
  setConnected: (connected) => set({ isConnected: connected }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setCurrentReasoning: (reasoning) => set({ currentReasoning: reasoning }),
  setWebSocket: (ws) => set({ ws }),
  setThreadId: (threadId) => set({ threadId })
}));

