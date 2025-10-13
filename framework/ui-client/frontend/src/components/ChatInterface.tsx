import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore, Message } from '../store';
import { api } from '../api';
import './ChatInterface.css';

interface ChatInterfaceProps {
  agent: {
    id: string;
    name: string;
  };
}

export default function ChatInterface({ agent }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentReasoning, setCurrentReasoning] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    threadId,
    ws,
    addMessage,
    clearMessages,
    setStreaming,
    setThreadId,
    setWebSocket
  } = useStore();

  useEffect(() => {
    // Connect WebSocket
    const websocket = api.connectWebSocket();

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWebSocket(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('Connected with ID:', data.clientId);
          break;

        case 'chunk':
          handleStreamChunk(data.chunk);
          break;

        case 'complete':
          handleStreamComplete(data.result);
          break;

        case 'error':
          console.error('WebSocket error:', data.error);
          alert('Error: ' + data.error);
          setStreaming(false);
          setIsThinking(false);
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWebSocket(null);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  const handleStreamChunk = (chunk: any) => {
    switch (chunk.type) {
      case 'reasoning':
        setIsThinking(true);
        setCurrentReasoning((prev) => prev + (chunk.content || ''));
        break;

      case 'content':
        setIsThinking(false);
        setCurrentMessage((prev) => prev + (chunk.content || ''));
        break;

      case 'tool_call':
        if (chunk.toolCall) {
          addMessage({
            id: Date.now().toString(),
            role: 'system',
            content: `🔧 Calling tool: ${chunk.toolCall.intent}`,
            timestamp: Date.now()
          });
        }
        break;

      case 'done':
        setIsThinking(false);
        break;
    }
  };

  const handleStreamComplete = (result: any) => {
    setStreaming(false);
    setIsThinking(false);

    if (currentMessage) {
      addMessage({
        id: Date.now().toString(),
        role: 'agent',
        content: currentMessage,
        reasoning: currentReasoning,
        timestamp: Date.now()
      });
    } else if (result.message) {
      addMessage({
        id: Date.now().toString(),
        role: 'agent',
        content: result.message,
        reasoning: currentReasoning,
        timestamp: Date.now()
      });
    }

    setCurrentMessage('');
    setCurrentReasoning('');

    if (result.reason === 'error') {
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: `❌ Error: ${result.error}`,
        timestamp: Date.now()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !ws || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    addMessage(userMessage);
    setInput('');
    setStreaming(true);
    setCurrentMessage('');
    setCurrentReasoning('');

    // Create thread if needed
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const result = await api.createThread(agent.id);
      currentThreadId = result.threadId;
      setThreadId(currentThreadId);
    }

    // Send message via WebSocket
    ws.send(JSON.stringify({
      type: 'run',
      threadId: currentThreadId,
      agentId: agent.id,
      query: input
    }));
  };

  const handleClearChat = () => {
    if (confirm('Clear all messages?')) {
      clearMessages();
      setCurrentMessage('');
      setCurrentReasoning('');
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div>
          <h2>{agent.name}</h2>
          <p>{messages.length} messages</p>
        </div>
        <button onClick={handleClearChat} className="clear-btn">
          Clear Chat
        </button>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <span className="role">
                {message.role === 'user' ? '👤' : message.role === 'agent' ? '🤖' : '⚙️'}
                {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
              </span>
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.reasoning && (
              <details className="reasoning">
                <summary>💭 View reasoning</summary>
                <div className="reasoning-content">
                  <ReactMarkdown>{message.reasoning}</ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="message agent thinking">
            <div className="message-header">
              <span className="role">🤖 Agent</span>
            </div>
            <div className="thinking-indicator">
              <div className="spinner"></div>
              <div className="thinking-text">
                {currentReasoning ? (
                  <>
                    <strong>Thinking:</strong>
                    <div className="reasoning-preview">
                      <ReactMarkdown>{currentReasoning.slice(-200) + '...'}</ReactMarkdown>
                    </div>
                  </>
                ) : (
                  'Thinking...'
                )}
              </div>
            </div>
          </div>
        )}

        {currentMessage && (
          <div className="message agent">
            <div className="message-header">
              <span className="role">🤖 Agent</span>
            </div>
            <div className="message-content streaming">
              <ReactMarkdown>{currentMessage}</ReactMarkdown>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={!input.trim() || isStreaming}>
          {isStreaming ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

