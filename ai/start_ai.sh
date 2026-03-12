#!/bin/bash
cd "$(dirname "$0")"

echo "Starting AI Vector Store Service..."

# Ensure venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements if needed
echo "Installing/verifying dependencies..."
pip install -r requirements.txt

# Start the FastAPI server
echo "Starting Uvicorn server on port 8000..."
uvicorn qdrant_service:app --host 0.0.0.0 --port 8000 --reload
