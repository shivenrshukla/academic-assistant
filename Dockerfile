# /Dockerfile
# Optimized for Render Free Tier (512MB RAM)
FROM node:18-alpine

WORKDIR /app

# Only copy backend dependencies first
COPY backend/package*.json ./
RUN npm install --production && npm cache clean --force

# Copy the rest of the backend code
COPY backend/ .

# We no longer need the Python AI service installation!
# This saves ~2GB of image size and ~400MB of runtime RAM.

EXPOSE 5000

CMD ["npm", "start"]
