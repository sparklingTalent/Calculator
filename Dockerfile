# Multi-stage build for Shipping Calculator
FROM node:20-alpine AS base

WORKDIR /app

# Install root dependencies (if needed)
COPY package*.json ./
RUN npm ci --omit=dev || true

# Copy and install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy all backend source files
WORKDIR /app
COPY backend/ ./backend/

# Verify backend files are copied
RUN ls -la /app/backend/ | head -10

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Build frontend
COPY frontend/ ./
RUN npm run build

# Production stage - only backend
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend package files
COPY --from=base /app/backend/package*.json ./
RUN npm ci --omit=dev

# Copy ALL backend files (the * copies everything including server.js)
COPY --from=base /app/backend/ ./

# Verify server.js exists
RUN ls -la /app/ && test -f /app/server.js && echo "✓ server.js found" || (echo "✗ server.js NOT found" && exit 1)

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
