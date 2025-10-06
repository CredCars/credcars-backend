# ===========================
# Backend Dockerfile (Optimized)
# ===========================

# ---------- Build stage ----------
FROM node:18-bookworm-slim AS builder

USER root
WORKDIR /app

# Set non-interactive frontend for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install build tools and dependencies
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

# Install Node.js LTS (optional, already node:18, but ensures latest fixes)
# RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
#     apt-get install -y nodejs && \
#     rm -rf /var/lib/apt/lists/*

# Copy package.json and install dependencies first (caching)
COPY package*.json ./
RUN npm install --unsafe-perm --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the app and build it
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:18-bookworm-slim AS runtime

WORKDIR /app

# Copy production node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Add healthcheck for CI/CD deployment
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -f http://localhost:3000/health || exit 1

# Start NestJS app
CMD ["node", "dist/main.js"]
