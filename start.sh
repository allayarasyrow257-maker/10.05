#!/bin/bash

echo "QR Restaurant Ordering System"
echo "================================="
echo ""

# Kill any existing processes on required ports
echo "Cleaning up old processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
sleep 1

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo "PostgreSQL is not running. Start it with: brew services start postgresql"
  exit 1
fi

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

# Save starting directory
START_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend
cd "$START_DIR/backend"
echo "Starting backend on port 3001..."
npm run dev &
BACKEND_PID=$!
sleep 3

# Start frontend
cd "$START_DIR/frontend"
echo "Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!
sleep 4

echo ""
echo "========================================="
echo "  QR Menu is running!"
echo "========================================="
echo "  Local:     http://localhost:3000"
echo "  Network:   http://$LOCAL_IP:3000"
echo ""
echo "  Admin:     http://$LOCAL_IP:3000/admin"
echo "  Menu:      http://$LOCAL_IP:3000/menu?table=1"
echo "  Backend:   http://localhost:3001"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" EXIT

wait
