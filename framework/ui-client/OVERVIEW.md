# Agent Framework UI Client - Overview

## What is This?

The Agent Framework UI Client is a modern, web-based interface for creating, managing, and interacting with AI agents. It provides a visual, user-friendly way to work with the Agent Framework without writing code.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           React Frontend (Port 3000)                │    │
│  │                                                      │    │
│  │  • Agent Creation Form                              │    │
│  │  • Agent List & Selection                           │    │
│  │  • Chat Interface with Streaming                    │    │
│  │  • Real-time Reasoning Display                      │    │
│  └──────────────┬──────────────────────────────────────┘    │
└─────────────────┼──────────────────────────────────────────┘
                  │
                  │ REST API + WebSocket
                  │
┌─────────────────▼──────────────────────────────────────────┐
│           Express Backend (Port 3001)                       │
│                                                              │
│  • Agent Management (CRUD)                                  │
│  • Thread Management                                        │
│  • WebSocket Streaming                                      │
│  • Tool Function Conversion                                 │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │         Agent Framework Core                    │        │
│  │                                                  │        │
│  │  • Agent Runtime                                 │        │
│  │  • Context Building                              │        │
│  │  • Tool Execution                                │        │
│  │  • Stream Processing                             │        │
│  └────────────────┬─────────────────────────────────┘        │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ API Calls
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                  LLM Providers                                │
│                                                               │
│  ┌────────────────┐              ┌────────────────┐         │
│  │    OpenAI      │              │ Local Models   │         │
│  │   (gpt-4o)     │              │ (LM Studio,    │         │
│  │                │              │  Ollama, etc.) │         │
│  └────────────────┘              └────────────────┘         │
└───────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Agent Creation**
- Visual form-based agent creation
- Configure system prompts
- Choose between OpenAI or local models
- Define custom tools with JSON
- Pre-filled examples for quick start

### 2. **Real-Time Chat**
- Stream agent responses live
- See reasoning as it happens
- Visual tool call indicators
- Message history per agent
- Clean, modern interface

### 3. **Agent Management**
- Create multiple agents
- Switch between agents instantly
- Each agent maintains separate conversation
- Delete agents you no longer need
- View agent configurations

### 4. **Reasoning Visualization**
- Watch the agent "think" in real-time
- Collapsible reasoning sections
- Performance insights
- Debug agent behavior

### 5. **Tool System**
- Define tools as JSON
- Examples provided (calculator, time, etc.)
- Support for async operations
- Flexible parameter schemas
- See tool calls in chat

## Technology Stack

### Frontend
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **Vite**: Lightning-fast build tool
- **CSS3**: Custom styling with dark/light modes

### Backend
- **Node.js**: Runtime environment
- **Express**: Web server framework
- **ws**: WebSocket server
- **TypeScript**: Type-safe development

### Core
- **Agent Framework**: The underlying AI agent system
- **OpenAI API**: For GPT models
- **OpenAI-Compatible**: For local models

## File Structure

```
ui-client/
├── README.md                 # Main documentation
├── QUICKSTART.md             # Quick start guide
├── OVERVIEW.md               # This file
├── TOOL_EXAMPLES.md          # Tool definition examples
├── start.sh                  # Unix start script
├── start.bat                 # Windows start script
├── package.json              # Root package (optional)
│
├── backend/
│   ├── server.ts             # Main server file
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # TypeScript config
│
└── frontend/
    ├── index.html            # HTML entry point
    ├── vite.config.ts        # Vite configuration
    ├── package.json          # Frontend dependencies
    ├── tsconfig.json         # TypeScript config
    │
    └── src/
        ├── main.tsx          # React entry point
        ├── App.tsx           # Main app component
        ├── App.css           # Main app styles
        ├── index.css         # Global styles
        ├── store.ts          # State management
        ├── api.ts            # API client
        │
        └── components/
            ├── AgentList.tsx      # Agent sidebar
            ├── AgentList.css
            ├── CreateAgent.tsx    # Agent creation form
            ├── CreateAgent.css
            ├── ChatInterface.tsx  # Chat UI
            └── ChatInterface.css
```

## Data Flow

### Creating an Agent

```
User fills form
    ↓
Frontend validates
    ↓
POST /api/agents
    ↓
Backend creates Agent instance
    ↓
Store in memory
    ↓
Return agent ID
    ↓
Frontend updates agent list
    ↓
User can now chat with agent
```

### Chatting with an Agent

```
User types message
    ↓
Frontend sends via WebSocket
    ↓
Backend receives message
    ↓
Create/get thread
    ↓
Call agent.streamRun()
    ↓
Stream chunks back via WebSocket
    ├─→ reasoning chunks
    ├─→ content chunks
    ├─→ tool_call chunks
    └─→ done chunk
    ↓
Frontend displays in real-time
    ↓
Message added to history
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create new agent |
| GET | `/api/agents/:id` | Get agent details |
| DELETE | `/api/agents/:id` | Delete an agent |
| POST | `/api/threads` | Create new thread |
| GET | `/api/threads/:id` | Get thread info |

### WebSocket Messages

**Client to Server:**
```typescript
{
  type: 'run',
  threadId: string,
  agentId: string,
  query: string
}
```

**Server to Client:**
```typescript
// Connection established
{ type: 'connected', clientId: string }

// Streaming chunks
{
  type: 'chunk',
  chunk: {
    type: 'reasoning' | 'content' | 'tool_call' | 'done',
    content?: string,
    toolCall?: { intent: string }
  }
}

// Stream complete
{
  type: 'complete',
  result: {
    message: string,
    reason: string,
    error?: string
  }
}

// Error
{ type: 'error', error: string }
```

## Security Considerations

⚠️ **Important**: This is a development/demo application. Before production use:

1. **Authentication**: Add user authentication and authorization
2. **Tool Execution**: Don't use `eval()` for tool functions in production
3. **Rate Limiting**: Implement rate limits on API endpoints
4. **Input Validation**: Validate and sanitize all user inputs
5. **CORS**: Configure CORS properly for your domain
6. **HTTPS/WSS**: Use secure connections in production
7. **API Keys**: Don't expose API keys in frontend code
8. **Database**: Use a proper database instead of in-memory storage
9. **Error Handling**: Implement comprehensive error handling
10. **Logging**: Add proper logging and monitoring

## Performance Considerations

- **Streaming**: Uses WebSocket for real-time streaming
- **State Management**: Zustand for efficient React state
- **Memory**: Agents stored in memory (use DB for production)
- **Concurrency**: Express handles multiple connections
- **Build**: Vite for fast development and optimized production builds

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ⚠️ Works but UI optimized for desktop

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process on port 3001 or 3000
lsof -ti:3001 | xargs kill
lsof -ti:3000 | xargs kill
```

**WebSocket won't connect:**
- Ensure backend is running
- Check browser console for errors
- Verify firewall settings
- Try refreshing the page

**Tool execution fails:**
- Check backend console for errors
- Verify tool JSON syntax
- Ensure execute function is a string
- Test function logic separately

**Agent creation fails:**
- Verify API keys (OpenAI)
- Check model server (local models)
- Validate JSON syntax
- Check backend logs

## Future Enhancements

Potential improvements:
- [ ] Persistent storage (database)
- [ ] User authentication
- [ ] Agent sharing and templates
- [ ] Advanced tool builder UI
- [ ] Conversation export
- [ ] Multi-agent orchestration UI
- [ ] Tool marketplace
- [ ] Analytics and insights
- [ ] Mobile app
- [ ] Deployment guides

## Support

- **Documentation**: See README.md and QUICKSTART.md
- **Examples**: See TOOL_EXAMPLES.md
- **Issues**: Check backend terminal for errors
- **Community**: Refer to main Agent Framework docs

## License

Same as the Agent Framework project.

---

**Ready to build?** Check out [QUICKSTART.md](QUICKSTART.md) to get started!

