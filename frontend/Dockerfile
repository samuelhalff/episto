# syntax=docker/dockerfile:1

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy workspace manifests and tsconfig (shared extends ../tsconfig.base.json)
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY .husky/install.mjs ./.husky/install.mjs
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=shared --workspace=frontend --include-workspace-root

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build

WORKDIR /app

COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Build shared contracts first
RUN npm run build --workspace=shared

# Build the Next.js app with standalone output
# NEXT_PUBLIC_* build-time variables must be injected here as build args.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_ENV=production
ARG API_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
ENV API_URL=${API_URL}

RUN npm run build --workspace=frontend

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output bundles its own node_modules subset.
# Copy only the standalone server and the static assets.
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=nextjs:nodejs /app/frontend/public ./frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000 || exit 1

CMD ["node", "frontend/server.js"]
