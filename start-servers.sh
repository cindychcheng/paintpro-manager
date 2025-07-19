#!/bin/bash

# Kill any existing processes
pkill -f "vite|ts-node" 2>/dev/null || true

echo "🚀 Starting Painting Business Management System..."

# Start backend server
echo "📦 Starting backend server on port 5001..."
cd /Users/hunniebearu/Desktop/invoice
nohup npx ts-node src/simple-app.ts > backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend server  
echo "🎨 Starting frontend server on port 3001..."
cd /Users/hunniebearu/Desktop/invoice/client
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for servers to start
sleep 5

echo ""
echo "✅ Servers started!"
echo "🔗 Frontend: http://localhost:3000 or http://localhost:3001"
echo "🔗 Backend API: http://localhost:5001/api/health"
echo ""
echo "📋 Backend PID: $BACKEND_PID"
echo "📋 Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 To stop servers: pkill -f 'vite|ts-node'"
echo "📝 Check logs: tail -f backend.log frontend.log"