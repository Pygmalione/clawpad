# ClawPad - Imperialny Fork
# Multi-stage: build z Node 22 Alpine + pnpm + runtime standalone

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
WORKDIR /app

# ---- deps ----
FROM base AS deps
RUN apk add --no-cache libc6-compat git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- builder ----
FROM base AS builder
RUN apk add --no-cache libc6-compat git
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ustaw NODE_ENV prod przed buildem
ENV NODE_ENV=production

# Build Next.js standalone
RUN pnpm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
