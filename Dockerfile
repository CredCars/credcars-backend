# ---------- Build stage ----------
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
       python3 \
       python3-distutils \
       make \
       g++ \
       git \
       curl \
       wget && \
    rm -rf /var/lib/apt/lists/*


# Install Node dependencies
COPY package*.json ./

# Upgrade npm
RUN npm install -g npm@11.6.1

# Install dependencies
RUN npm install --omit=dev --unsafe-perm --no-audit --no-fund && npm cache clean --force


# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:18-bullseye-slim AS runtime

WORKDIR /app

# Copy production files only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
