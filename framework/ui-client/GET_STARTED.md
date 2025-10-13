# 🚀 Get Started with Agent Framework UI

Welcome! This guide will get you up and running in just a few minutes.

## ⚡ Quick Start (< 5 minutes)

### 1. Install Dependencies

```bash
cd /Users/adrien/Documents/Projects/agent-framework/framework/ui-client

# Option A: Install all at once
npm run install:all

# Option B: Install separately
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start the Servers

**Easy Way (Recommended):**
```bash
# From ui-client directory
./start.sh
```

**Alternative Way:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Open Your Browser

Navigate to: **http://localhost:3000**

### 4. Create Your First Agent

1. Click **"+ Create Agent"**
2. Fill in:
   - **Name**: "My Assistant"
   - **System Prompt**: "You are a helpful assistant"
   - **Connector**: "OpenAI Compatible"
   - **Model**: "ibm/granite-4-h-tiny"
   - **Base URL**: "http://192.168.1.123:1234/v1"
   - **Tools**: (pre-filled examples)
3. Click **"Create Agent"**

### 5. Start Chatting! 🎉

Try asking:
- "What's 25 times 48?"
- "What time is it?"
- "Transform 'hello world' to uppercase"

## 📖 What's Included

### Files Created

```
ui-client/
├── 📚 Documentation
│   ├── README.md           - Main documentation
│   ├── QUICKSTART.md       - Quick start guide
│   ├── OVERVIEW.md         - Architecture overview
│   ├── TOOL_EXAMPLES.md    - Tool examples
│   ├── FEATURES.md         - Feature list
│   └── GET_STARTED.md      - This file
│
├── 🛠️ Scripts
│   ├── start.sh            - Unix start script
│   ├── start.bat           - Windows start script
│   ├── demo-setup.sh       - Demo agent setup
│   └── package.json        - Root package
│
├── 🔧 Backend (Port 3001)
│   ├── server.ts           - Express + WebSocket server
│   ├── package.json
│   └── tsconfig.json
│
└── 🎨 Frontend (Port 3000)
    ├── src/
    │   ├── main.tsx        - Entry point
    │   ├── App.tsx         - Main app
    │   ├── store.ts        - State management
    │   ├── api.ts          - API client
    │   └── components/
    │       ├── AgentList.tsx
    │       ├── CreateAgent.tsx
    │       └── ChatInterface.tsx
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

## 🎯 Key Features

✅ **Real-time Streaming** - See responses as they're generated
✅ **Reasoning Display** - Watch the agent think
✅ **Multiple Agents** - Create and switch between agents
✅ **Custom Tools** - Define your own tools with JSON
✅ **Modern UI** - Beautiful, responsive design
✅ **Local Models** - Use LM Studio, Ollama, etc.

## 🔌 Connector Setup

### Using OpenAI

1. Set your API key:
```bash
export OPENAI_API_KEY=sk-...
```

2. When creating agent:
   - Connector: **OpenAI**
   - Model: **gpt-4o** or **gpt-4**

### Using Local Models

1. Start your model server (e.g., LM Studio)

2. When creating agent:
   - Connector: **OpenAI Compatible**
   - Base URL: **http://localhost:1234/v1**
   - Model: Your model name

## 📚 Next Steps

### Learn More
- **Tool Examples**: See `TOOL_EXAMPLES.md` for 15+ tool examples
- **Architecture**: Read `OVERVIEW.md` for system architecture
- **Features**: Check `FEATURES.md` for complete feature list

### Customize
- Create custom tools for your use case
- Experiment with different system prompts
- Try different models and compare results

### Build
- Extend the UI with new components
- Add new API endpoints
- Integrate with external services

## 🆘 Troubleshooting

### Servers won't start
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill processes if needed
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
```

### WebSocket not connecting
1. Ensure backend is running on port 3001
2. Refresh the browser
3. Check browser console for errors

### Agent creation fails
1. Verify OpenAI API key (if using OpenAI)
2. Check local model server is running
3. Validate JSON syntax in tools
4. Check backend terminal for errors

## 💡 Pro Tips

1. **Use the demo script** to quickly set up a test agent:
   ```bash
   ./demo-setup.sh
   ```

2. **Save your tool definitions** from `TOOL_EXAMPLES.md` for reuse

3. **Watch the backend console** to see what's happening server-side

4. **Open browser DevTools** to see WebSocket messages in Network tab

5. **Start simple** with basic tools, then build more complex ones

## 🎓 Learning Resources

### Tutorials
1. Create your first agent (above)
2. Define custom tools (`TOOL_EXAMPLES.md`)
3. Understand streaming (`OVERVIEW.md`)
4. Explore reasoning visualization

### Examples
- Calculator tool
- Time/date tools
- Text manipulation
- Random generators
- Array operations

### Community
- Check the main Agent Framework docs
- Review the 12-factor-agents guide
- Explore example implementations

## 🚦 System Status

After starting, verify:

✅ Backend running: http://localhost:3001/health
✅ Frontend running: http://localhost:3000
✅ WebSocket ready: Check browser console

## 🎉 You're Ready!

You now have a complete, working AI agent system with:
- Visual interface for creating agents
- Real-time chat with streaming
- Reasoning visualization
- Custom tool support
- Multiple agent management

**Happy building!** 🚀

---

## Quick Reference

| Task | Command |
|------|---------|
| Install all | `npm run install:all` |
| Start both | `./start.sh` or `npm start` |
| Start backend | `cd backend && npm start` |
| Start frontend | `cd frontend && npm run dev` |
| Demo setup | `./demo-setup.sh` |
| Health check | `curl http://localhost:3001/health` |

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Frontend UI |
| http://localhost:3001 | Backend API |
| ws://localhost:3001 | WebSocket |

Need help? Check the other documentation files or open an issue on GitHub.

