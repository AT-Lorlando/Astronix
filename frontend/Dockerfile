# Build context is the REPO ROOT (see docker-compose.yml) so the pnpm workspace
# lockfile is available. Builds the node-server output for the web target.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter ./frontend...
COPY frontend ./frontend
RUN pnpm --filter ./frontend build
# Produce an isolated deployable bundle (pruned prod node_modules + manifest)
RUN pnpm deploy --filter=frontend --prod --legacy /app

# Production image (Nuxt node-server)
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nuxtjs
COPY --from=build --chown=nuxtjs:nodejs /app ./
# Build artifacts are gitignored, so pnpm deploy omits them — copy explicitly
COPY --from=build --chown=nuxtjs:nodejs /repo/frontend/.output ./.output
USER nuxtjs
EXPOSE 3000
ENV PORT=3000 HOST=0.0.0.0
CMD ["node", ".output/server/index.mjs"]
