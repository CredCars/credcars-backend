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
       build-essential \
       git && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --unsafe-perm --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev
