#!/bin/bash

# Demo Setup Script
# This script creates a demo agent via the API for quick testing

echo "🎬 Setting up demo agent..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ Backend server is not running!"
    echo "Please start the backend server first:"
    echo "  cd backend && npm start"
    echo ""
    exit 1
fi

echo "✅ Backend server is running"
echo ""

# Create demo agent
echo "Creating demo agent..."

RESPONSE=$(curl -s -X POST http://localhost:3001/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Assistant",
    "systemPrompt": "You are a helpful demo assistant with access to various tools. You can perform calculations, tell the time, generate random numbers, and transform text. Be friendly and demonstrate your capabilities!",
    "connector": "openai-compatible",
    "model": "ibm/granite-4-h-tiny",
    "baseURL": "http://192.168.1.123:1234/v1",
    "tools": {
      "calculate": {
        "intent": "calculate",
        "description": "Perform mathematical calculations",
        "parameters": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string",
              "description": "Mathematical expression to evaluate"
            }
          },
          "required": ["expression"]
        },
        "execute": "async (args) => { const result = eval(args.expression); return { result, expression: args.expression }; }"
      },
      "get_time": {
        "intent": "get_time",
        "description": "Get the current time",
        "parameters": {
          "type": "object",
          "properties": {
            "timezone": {
              "type": "string",
              "description": "Timezone (optional)"
            }
          }
        },
        "execute": "async (args) => { const now = new Date(); return { time: now.toISOString(), formatted: now.toLocaleString(), timezone: args.timezone || '\''local'\'' }; }"
      },
      "random_number": {
        "intent": "random_number",
        "description": "Generate a random number",
        "parameters": {
          "type": "object",
          "properties": {
            "min": {
              "type": "number",
              "description": "Minimum value"
            },
            "max": {
              "type": "number",
              "description": "Maximum value"
            }
          },
          "required": ["min", "max"]
        },
        "execute": "async (args) => { const num = Math.floor(Math.random() * (args.max - args.min + 1)) + args.min; return { number: num, min: args.min, max: args.max }; }"
      },
      "text_transform": {
        "intent": "text_transform",
        "description": "Transform text (uppercase, lowercase, reverse)",
        "parameters": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string",
              "description": "Text to transform"
            },
            "operation": {
              "type": "string",
              "description": "Operation: '\''upper'\'', '\''lower'\'', or '\''reverse'\''"
            }
          },
          "required": ["text", "operation"]
        },
        "execute": "async (args) => { const ops = { upper: () => args.text.toUpperCase(), lower: () => args.text.toLowerCase(), reverse: () => args.text.split('\'''\'').reverse().join('\'''\'') }; const result = ops[args.operation] ? ops[args.operation]() : '\''Invalid operation'\''; return { original: args.text, operation: args.operation, result }; }"
      }
    }
  }')

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    AGENT_ID=$(echo "$RESPONSE" | grep -o '"agentId":"[^"]*' | cut -d'"' -f4)
    echo "✅ Demo agent created successfully!"
    echo "   Agent ID: $AGENT_ID"
    echo ""
    echo "🎉 You can now open http://localhost:3000 and start chatting!"
    echo ""
    echo "Try asking:"
    echo "  • What's 25 * 48?"
    echo "  • What time is it?"
    echo "  • Give me a random number between 1 and 100"
    echo "  • Transform 'hello world' to uppercase"
    echo ""
else
    echo "❌ Failed to create demo agent"
    echo "Response: $RESPONSE"
    echo ""
    exit 1
fi

