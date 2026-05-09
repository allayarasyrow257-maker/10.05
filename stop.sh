#!/bin/bash

echo "QR Restaurant Ordering System - Stop Script"
echo "============================================"
echo ""

# Find and kill processes listening on ports 3000, 3001, and 3002
echo "Stopping servers on ports 3000, 3001, and 3002..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Clean up any lingering Node or npm processes
echo "Cleaning up lingering node processes..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "node" 2>/dev/null

echo ""
echo "============================================"
echo "  All servers and processes are stopped!"
echo "============================================"
echo ""