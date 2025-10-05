# Use Node.js 18 Alpine as base image
FROM node:18 AS builder

WORKDIR /app

# Install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build \
  && npm prune --omit=dev

# ----- Runtime image -----
FROM node:18-slim AS runtime

WORKDIR /app

# Copy production deps and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
