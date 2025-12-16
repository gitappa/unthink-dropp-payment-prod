# Multi-stage build for production

# Builder: install deps and compile TypeScript
FROM node:18 AS builder
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Copy the rest of the project
COPY . ./

# Install all deps and build
RUN npm ci
RUN npm run build

# Remove dev dependencies to reduce size
RUN npm prune --production

# Runner: smaller image with production deps + compiled output
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies and build output from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dropp-sdk-js ./dropp-sdk-js

# Default port for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["node", "dist/index-express.js"]
