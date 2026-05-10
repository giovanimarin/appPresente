# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifests do monorepo para cache de deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --workspace=packages/shared --ignore-scripts

# Copia código fonte
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Gera Prisma client e compila TypeScript (tsc --build respeita project references)
RUN cd apps/api && npx prisma generate && npx tsc --build tsconfig.json

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init openssl

WORKDIR /app

ENV NODE_ENV=production

# Copia apenas o necessário
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/entrypoint.sh ./apps/api/entrypoint.sh
COPY --from=builder /app/node_modules ./node_modules

# Recria node_modules do workspace de produção (sem devDeps)
RUN npm ci --workspace=apps/api --workspace=packages/shared --omit=dev --ignore-scripts

# Copia Prisma client gerado + CLI (necessário para migrate deploy no entrypoint)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

RUN chmod +x /app/apps/api/entrypoint.sh

EXPOSE 3001

CMD ["/app/apps/api/entrypoint.sh"]
