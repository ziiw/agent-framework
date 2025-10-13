import { useState, useEffect } from 'react';
import { useStore } from './store';
import { api } from './api';
import AgentList from './components/AgentList';
import CreateAgent from './components/CreateAgent';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const { agents, selectedAgentId, setAgents, selectAgent } = useStore();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const agentList = await api.getAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleCreateAgent = async (agentData: any) => {
    try {
      const result = await api.createAgent(agentData);
      if (result.success) {
        await loadAgents();
        setShowCreateAgent(false);
        selectAgent(result.agentId);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Check console for details.');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    try {
      await api.deleteAgent(agentId);
      await loadAgents();
      if (selectedAgentId === agentId) {
        selectAgent(agents[0]?.id || '');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Agent Framework UI</h1>
        <button onClick={() => setShowCreateAgent(true)} className="create-btn">
          + Create Agent
        </button>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <AgentList
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={selectAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        </aside>

        <main className="main-content full-width-main">
          {showCreateAgent ? (
            <CreateAgent
              onSubmit={handleCreateAgent}
              onCancel={() => setShowCreateAgent(false)}
            />
          ) : selectedAgent ? (
            <ChatInterface agent={selectedAgent} />
          ) : (
            <div className="empty-state">
              <h2>No Agent Selected</h2>
              <p>Create an agent or select one from the sidebar to get started.</p>
              <button onClick={() => setShowCreateAgent(true)}>Create Your First Agent</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

