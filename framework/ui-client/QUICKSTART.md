# Quick Start Guide

Get up and running with the Agent Framework UI in 3 simple steps!

## Option 1: Automated Start (Recommended)

### On macOS/Linux:
```bash
cd /Users/adrien/Documents/Projects/agent-framework/framework/ui-client
./start.sh
```

### On Windows:
```cmd
cd \path\to\agent-framework\framework\ui-client
start.bat
```

This will:
- Install dependencies if needed
- Start the backend server on port 3001
- Start the frontend server on port 3000
- Open your browser automatically

## Option 2: Manual Start

### Step 1: Install Dependencies

```bash
# Install all dependencies at once
npm run install:all

# Or install separately:
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Start Both Servers

```bash
# From the ui-client directory
npm start
```

This uses `concurrently` to run both servers at once.

### Step 3: Open Your Browser

Navigate to: **http://localhost:3000**

## Option 3: Individual Server Control

If you prefer to run servers separately:

### Terminal 1 - Backend:
```bash
cd backend
npm start
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## First Time Setup

### Using OpenAI

1. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=sk-...
   ```

2. When creating an agent:
   - Select "OpenAI" as connector
   - Choose model: `gpt-4o` or `gpt-4`

### Using Local Models (LM Studio, Ollama, etc.)

1. Start your local model server (e.g., LM Studio on port 1234)

2. When creating an agent:
   - Select "OpenAI Compatible" as connector
   - Set Base URL: `http://localhost:1234/v1`
   - Set Model: your model name (e.g., `ibm/granite-4-h-tiny`)

## Creating Your First Agent

1. Click "**+ Create Agent**" button
2. Fill in the form:
   - **Name**: "My Assistant"
   - **System Prompt**: "You are a helpful assistant"
   - **Connector**: Choose OpenAI or OpenAI Compatible
   - **Model**: Enter model name
   - **Tools**: Use the provided example or create your own
3. Click "**Create Agent**"
4. Start chatting! 🎉

## Example Tools

The UI pre-fills example tools:
- `calculate` - Evaluate math expressions
- `get_time` - Get current time

You can customize these or add your own!

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify you're in the correct directory
- Run `npm install` in the backend directory

### Frontend won't start
- Check if port 3000 is already in use
- Verify you're in the correct directory
- Run `npm install` in the frontend directory

### WebSocket connection errors
- Make sure backend is running
- Refresh the browser page
- Check browser console for errors

### Agent creation fails
- Verify OpenAI API key (if using OpenAI)
- Check local model server is running (if using OpenAI Compatible)
- Ensure tools JSON is valid
- Check backend terminal for error messages

## Next Steps

- Explore different system prompts
- Create custom tools
- Try different models
- Build multi-agent workflows

Enjoy building with the Agent Framework! 🚀

