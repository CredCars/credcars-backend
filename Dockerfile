# ---------- Build stage ----------
FROM node:18-bookworm-slim AS builder

# Use root to install dependencies
USER root
WORKDIR /app

# Install essential build tools and dependencies
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
       ca-certificates \
       python3 \
       python3-distutils \
       make \
       g++ \
       build-essential \
       git \
       curl \
       wget && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
# Use npm install instead of npm ci to avoid issues on Node 18
RUN npm install --unsafe-perm --no-audit --no-fund && npm cache clean --force

# Copy app source and build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:18-bookworm-slim AS runtime

WORKDIR /app

# Copy production node_modules and build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start NestJS app
CMD ["node", "dist/main.js"]
