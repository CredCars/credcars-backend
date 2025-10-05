# Use Node.js 18 (Debian Bookworm)
FROM node:18-bookworm-slim AS builder

USER root
WORKDIR /app

# Install system build tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       python3 \
       make \
       g++ \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies
COPY package*.json ./
RUN npm config set python /usr/bin/python3 \
    && npm config set unsafe-perm true \
    && npm install --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build \
    && npm prune --omit=dev

# ----- Runtime image -----
FROM node:18-bookworm-slim AS runtime

WORKDIR /app

# Copy production deps and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "dist/main.js"]
