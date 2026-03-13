# Use an official Python runtime as a parent image
FROM --platform=linux/amd64 python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (version 20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# --------- 1. Setup Python AI Service ---------
# Copy AI dependencies specifically to cache the pip install layer
COPY ai/requirements.txt ./ai/
RUN pip3 install --no-cache-dir -r ai/requirements.txt

# --------- 2. Setup Node.js Backend ---------
# Copy Node dependencies specifically to cache the npm install layer
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# --------- 3. Copy Application Code ---------
# Copy the rest of the application
COPY . .

# Ensure the startup script is executable
RUN chmod +x /app/start_services.sh

# Expose ports (Render automatically detects the exposed port, we'll use 5000 for Node)
# The python internal port 8000 doesn't need to be exposed outside the container
EXPOSE 5000

# Set the entrypoint
CMD ["/app/start_services.sh"]
