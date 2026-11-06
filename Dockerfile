# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies required for building native packages (if any)
RUN apk add --no-cache libc6-compat

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy full source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript / NestJS
RUN npm run build

# Prune devDependencies to keep production bundle small
RUN npm prune --omit=dev

# ==========================================
# STAGE 2: Runner (Production)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Create non-root user
USER node

# Copy production artifacts from builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
