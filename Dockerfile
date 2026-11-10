# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências necessárias para pacotes nativos (argon2, etc.)
RUN apk add --no-cache libc6-compat python3 make g++

# Copia descritores e schema do Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instala dependências completas
RUN npm ci

# Copia código-fonte
COPY . .

# Gera Prisma Client
RUN npx prisma generate

# Build TypeScript / NestJS
RUN npm run build

# ==========================================
# STAGE 2: Runner (Produção Otimizada)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Dependências do sistema (curl para healthcheck, libc6-compat para argon2)
RUN apk add --no-cache curl libc6-compat

# Copia arquivos do builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Garante permissão de execução no script de entrypoint
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
