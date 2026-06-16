# Build context is the REPO ROOT (see docker-compose.yml) so the pnpm workspace
# lockfile is available. Build, then `pnpm deploy` a self-contained prod bundle.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter ./backend...
COPY backend ./backend
RUN pnpm --filter ./backend build
# Produce an isolated deployable bundle (pruned prod node_modules + manifest)
RUN pnpm deploy --filter=backend --prod --legacy /app

# Production image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 adonisjs
COPY --from=build --chown=adonisjs:nodejs /app ./
# Build artifacts are gitignored, so pnpm deploy omits them — copy explicitly
COPY --from=build --chown=adonisjs:nodejs /repo/backend/build ./build
USER adonisjs
EXPOSE 3333
CMD ["node", "build/bin/server.js"]
