#!/bin/bash
# start_services.sh - Boot script for the monolithic Docker container

echo "Starting Academic Assistant - Monolithic Deployment"

# 1. Start the Python AI Service in the background
echo "Starting Python AI Service on port 8000..."
cd /app/ai
# The Dockerfile installs python dependencies globally, so we can just use python/uvicorn
python3 -m uvicorn qdrant_service:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

# Wait a moment to ensure Python service starts successfully
sleep 3

# 2. Start the Node.js Backend in the foreground
echo "Starting Node.js Backend on port 5000..."
cd /app/backend
npm start

# If Node exits, we should exit the script
NODE_EXIT_CODE=$?
echo "Node backend exited with code $NODE_EXIT_CODE"

# Cleanup the background python process if Node crashes
kill $PYTHON_PID
exit $NODE_EXIT_CODE
