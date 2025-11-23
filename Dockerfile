# Multi-stage build for Shipping Calculator
FROM node:20-alpine AS base

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Install frontend dependencies
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Build frontend
WORKDIR /app/frontend
COPY frontend/ ./
RUN npm run build

# Production stage - only backend
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend files
COPY --from=base /app/backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=base /app/backend ./

# Expose port
EXPOSE 3001

# Start server (already in /app which is the backend directory)
CMD ["node", "server.js"]

