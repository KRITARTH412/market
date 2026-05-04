#!/bin/bash

# PropMind AI Platform - Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting PropMind AI Platform..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d client/node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  Warning: MongoDB doesn't appear to be running"
    echo "Please start MongoDB before continuing"
    echo ""
fi

echo "✅ Dependencies installed"
echo ""
echo "🔧 Starting servers..."
echo ""
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Demo credentials:"
echo "  Email: owner@demo.com"
echo "  Password: Password123"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
cd client && npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
