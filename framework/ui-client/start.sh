#!/bin/bash

# Start script for Agent Framework UI
# This script starts both backend and frontend servers

echo "🚀 Starting Agent Framework UI..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependencies ready"
echo ""
echo "🔧 Starting backend server on http://localhost:3001..."
echo "🎨 Starting frontend server on http://localhost:3000..."
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
cd backend && npm start &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Start frontend in background
cd frontend && npm run dev &
FRONTEND_PID=$!

# Trap Ctrl+C and kill both processes
trap "echo ''; echo '👋 Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait

