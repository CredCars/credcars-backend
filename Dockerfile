FROM node:18-bookworm-slim AS builder

USER root
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
       ca-certificates \
       python3 \
       python3-distutils \
       make \
       g++ \
       git \
       build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm config set python /usr/bin/python3 && \
    npm config set unsafe-perm true && \
    npm install --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:18-bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
