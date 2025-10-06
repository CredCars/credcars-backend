# ---------- Build stage ----------
FROM node:18-bookworm-slim AS builder

WORKDIR /app

# Install build tools and dependencies in one layer
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
RUN npm install --unsafe-perm --no-audit --no-fund && npm cache clean --force

# Copy app and build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:18-bookworm-slim AS runtime

WORKDIR /app

# Copy production files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
