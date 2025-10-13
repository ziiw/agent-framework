import './AgentList.css';

interface Agent {
  id: string;
  name: string;
  toolCount: number;
  connector: string;
  model?: string;
}

interface AgentListProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onDeleteAgent: (id: string) => void;
}

export default function AgentList({
  agents,
  selectedAgentId,
  onSelectAgent,
  onDeleteAgent
}: AgentListProps) {
  return (
    <div className="agent-list">
      <h3>Your Agents</h3>
      {agents.length === 0 ? (
        <p className="no-agents">No agents yet. Create one to get started!</p>
      ) : (
        <ul>
          {agents.map((agent) => (
            <li
              key={agent.id}
              className={selectedAgentId === agent.id ? 'selected' : ''}
              onClick={() => onSelectAgent(agent.id)}
            >
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-meta">
                  {agent.toolCount} tools • {agent.connector}
                  {agent.model && ` • ${agent.model}`}
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAgent(agent.id);
                }}
                title="Delete agent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

