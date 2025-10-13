const API_URL = 'http://localhost:3001';

export const api = {
  async getAgents() {
    const response = await fetch(`${API_URL}/api/agents`);
    return response.json();
  },

  async createAgent(agentData: {
    name: string;
    systemPrompt: string;
    tools: any;
    connector: 'openai' | 'openai-compatible';
    model?: string;
    baseURL?: string;
    subAgents?: any[];
    mcpServers?: any[];
  }) {
    const response = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData)
    });
    return response.json();
  },

  async deleteAgent(agentId: string) {
    const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async createThread(agentId: string) {
    const response = await fetch(`${API_URL}/api/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    return response.json();
  },

  connectWebSocket() {
    return new WebSocket('ws://localhost:3001');
  }
};

