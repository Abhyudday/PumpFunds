# Use official Node.js runtime as the base image
FROM node:18-alpine

# Set working directory in the container
WORKDIR /app/server

# Copy package files from server directory
COPY server/package.json server/package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code from server directory
COPY server/ .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on (Railway will assign the actual port via PORT env var)
EXPOSE 8080

# Start the application
CMD ["npm", "start"] 