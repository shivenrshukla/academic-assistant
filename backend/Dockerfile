# /backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (caching optimization)
COPY package*.json ./
RUN npm install --production

# Copy the rest of your backend code
COPY . .

# Expose the port your Node app runs on
EXPOSE 5000

# Start the Node server
CMD ["npm", "start"]