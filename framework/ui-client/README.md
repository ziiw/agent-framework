# Agent Framework UI Client

A modern web-based UI for creating and interacting with agents from the Agent Framework. Features real-time streaming, reasoning visualization, and a beautiful interface.

## Features

- 🎨 **Modern UI** - Clean, responsive interface with dark/light mode support
- 🤖 **Agent Creation** - Visual interface to create and configure agents
- 💬 **Real-time Chat** - Stream agent responses with live reasoning display
- 🔧 **Tool Visualization** - See when and how agents use tools
- 📊 **Agent Management** - Create, switch between, and manage multiple agents
- 🌊 **WebSocket Streaming** - Real-time streaming of agent responses
- 💭 **Reasoning Display** - View the agent's thought process in real-time

## Architecture

The UI client consists of two parts:

1. **Backend Server** (`/backend`) - Express server with WebSocket support that interfaces with the Agent Framework
2. **Frontend** (`/frontend`) - React application with modern UI components

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- The Agent Framework installed (from `/framework` directory)
- OpenAI API key (for OpenAI connector) or local model server (for OpenAI-compatible connector)

### Installation

#### 1. Install Backend Dependencies

```bash
cd backend
npm install
# or
bun install
```

#### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
# or
bun install
```

### Running the Application

#### 1. Start the Backend Server

```bash
cd backend
npm start
# or
bun run server.ts
```

The backend will start on `http://localhost:3001`

#### 2. Start the Frontend Development Server

```bash
cd frontend
npm run dev
# or
bun run dev
```

The frontend will start on `http://localhost:3000`

#### 3. Open Your Browser

Navigate to `http://localhost:3000` and start creating agents!

## Usage

### Creating an Agent

1. Click the "Create Agent" button in the header
2. Fill in the agent details:
   - **Name**: A descriptive name for your agent
   - **System Prompt**: Instructions that define the agent's behavior
   - **Connector**: Choose between OpenAI or OpenAI-compatible (local models)
   - **Model**: Specify the model to use
   - **Base URL**: (For OpenAI-compatible) The URL of your local model server
   - **Tools**: Define tools in JSON format
3. Click "Create Agent"

### Tool Definition Format

Tools are defined as JSON objects where each key is a tool name:

```json
{
  "tool_name": {
    "intent": "tool_name",
    "description": "What the tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Parameter description"
        }
      },
      "required": ["param1"]
    },
    "execute": "async (args) => { /* Implementation as string */ }"
  }
}
```

**Note**: The `execute` function must be provided as a string. The backend will evaluate it. For security reasons, this is not recommended in production environments.

### Chatting with an Agent

1. Select an agent from the sidebar
2. Type your message in the input field at the bottom
3. Press Enter or click "Send"
4. Watch the agent think and respond in real-time!

### Features in the Chat

- **Live Reasoning**: See the agent's thought process as it streams
- **Tool Calls**: View when the agent uses tools
- **Message History**: All messages are preserved per agent
- **Clear Chat**: Start a new conversation at any time

## Configuration

### Backend Configuration

Edit `backend/server.ts` to configure:

- Port (default: 3001)
- CORS settings
- Default connector settings

### Frontend Configuration

Edit `frontend/vite.config.ts` to configure:

- Development port (default: 3000)
- API proxy settings

## API Reference

### REST Endpoints

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create a new agent
- `GET /api/agents/:id` - Get agent details
- `DELETE /api/agents/:id` - Delete an agent
- `POST /api/threads` - Create a new thread
- `GET /api/threads/:id` - Get thread details

### WebSocket Protocol

Connect to `ws://localhost:3001` and send/receive JSON messages:

**Client -> Server**:
```json
{
  "type": "run",
  "threadId": "thread_id",
  "agentId": "agent_id",
  "query": "user message"
}
```

**Server -> Client**:
```json
{
  "type": "chunk",
  "chunk": {
    "type": "reasoning" | "content" | "tool_call" | "done",
    "content": "streamed content"
  }
}
```

## Development

### Project Structure

```
ui-client/
├── backend/
│   ├── server.ts          # Express + WebSocket server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── AgentList.tsx
│   │   │   ├── CreateAgent.tsx
│   │   │   └── ChatInterface.tsx
│   │   ├── App.tsx        # Main app component
│   │   ├── store.ts       # Zustand state management
│   │   ├── api.ts         # API client
│   │   └── main.tsx       # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

### Technologies Used

**Backend**:
- Express - Web server
- ws - WebSocket server
- TypeScript

**Frontend**:
- React 18 - UI framework
- Zustand - State management
- Vite - Build tool
- TypeScript

## Troubleshooting

### WebSocket Connection Failed

- Make sure the backend server is running on port 3001
- Check that no firewall is blocking WebSocket connections
- Verify the WebSocket URL in `frontend/src/api.ts`

### Agent Creation Fails

- Verify your OpenAI API key is set (if using OpenAI connector)
- Check that your local model server is running (if using OpenAI-compatible)
- Ensure the tools JSON is valid
- Check backend console for detailed error messages

### Streaming Not Working

- Refresh the page to reconnect WebSocket
- Check browser console for WebSocket errors
- Verify backend server is running and accessible

## Production Deployment

⚠️ **Security Warning**: This implementation is for development/demo purposes. Before deploying to production:

1. **Remove dynamic `eval()`** in tool execution
2. **Add authentication** and user management
3. **Use a proper database** instead of in-memory storage
4. **Add rate limiting** to prevent abuse
5. **Validate and sanitize** all user inputs
6. **Use environment variables** for sensitive configuration
7. **Add HTTPS/WSS** for secure connections
8. **Implement proper error handling** and logging

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

Same license as the Agent Framework project.

## Support

For issues and questions, please refer to the main Agent Framework documentation or open an issue on GitHub.

