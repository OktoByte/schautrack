FROM node:24-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./

RUN npm ci && \
    npm cache clean --force

COPY client/ ./

RUN npm run build

FROM node:24-alpine AS server-builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /root/.npm

FROM node:24-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy only production dependencies from builder
COPY --from=server-builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=node:node src ./src
COPY --chown=node:node package.json ./

# Copy built React client
COPY --from=client-builder --chown=node:node /app/client/dist ./client/dist

ARG BUILD_VERSION=dev
ENV BUILD_VERSION=$BUILD_VERSION \
    NODE_ENV=production \
    PORT=3000 \
    TZ=UTC

# Run as non-root user
USER node

EXPOSE 3000

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "src/server.js"]
