# syntax=docker/dockerfile:1

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install Chromium for Puppeteer PDF rendering (MVP Option B — embedded)
# Keep this stage's apk cache small by removing temp files immediately.
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

WORKDIR /app

# Copy workspace manifests first to maximise layer caching
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm ci --workspace=shared --workspace=backend --include-workspace-root

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build

WORKDIR /app

COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared first, then backend
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install only the runtime Chromium libraries needed by Puppeteer
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

# Copy only what is needed to run
COPY --from=build --chown=nodeapp:nodejs /app/backend/dist ./dist
COPY --from=build --chown=nodeapp:nodejs /app/backend/drizzle ./drizzle
COPY --from=build --chown=nodeapp:nodejs /app/backend/node_modules ./node_modules
COPY --from=build --chown=nodeapp:nodejs /app/node_modules/.cache ./node_modules/.cache 2>/dev/null || true

# Copy shared dist so backend can resolve the workspace package
COPY --from=build --chown=nodeapp:nodejs /app/shared/dist ./shared/dist
COPY --from=build --chown=nodeapp:nodejs /app/shared/node_modules ./shared/node_modules 2>/dev/null || true

USER nodeapp

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

# Run migrations then start the API server
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
