# ---------- Build stage ----------
FROM node:18-bookworm-slim AS builder

USER root
WORKDIR /app

# Install build tools and dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
       ca-certificates \
       python3 \
       python3-distutils \
       make \
       g++ \
       build-essential \
       git && \
    rm -rf /var/lib/apt/lists/*

# Install all dependencies
COPY package*.json ./
RUN npm install --unsafe-perm --no-audit --no-fund

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

# Start NestJS app
CMD ["node", "dist/main.js"]
