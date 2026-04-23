# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --offline

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app .
ENV NEXT_TELEMETRY_DISABLED=1
# Generate the typed Prisma client (output: src/generated/prisma) before
# the Next.js build so the typed imports resolve.
RUN corepack enable && pnpm exec prisma generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/app/data/auth.sqlite

RUN addgroup --system --gid 1001 app \
    && adduser --system --uid 1001 --ingroup app app \
    && mkdir -p /app/data \
    && chown -R app:app /app/data

# Next.js standalone build — self-contained runtime with only the deps it
# actually traced (including @/generated/prisma since db.ts imports it).
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma ./prisma

# Install the Prisma CLI + engines fresh in the runner — the standalone
# output doesn't include the CLI (we don't call it from the app), but we
# need it at container start to sync the schema with the mounted volume.
# Isolate the install in /opt/prisma-cli to avoid interacting with the
# app's package.json peer deps (Storybook/Next pulls in a whole tree
# otherwise). Then symlink node_modules/.bin/prisma into /app.
RUN mkdir -p /opt/prisma-cli \
    && cd /opt/prisma-cli \
    && echo '{"name":"prisma-cli","private":true}' > package.json \
    && npm install --no-save --no-audit --no-fund prisma@6 @prisma/engines \
    && mkdir -p /app/node_modules/.bin \
    && ln -sf /opt/prisma-cli/node_modules/.bin/prisma /app/node_modules/.bin/prisma \
    && chown -R app:app /opt/prisma-cli /app/node_modules

# Entrypoint: sync schema (idempotent) then start the server.
COPY --chown=app:app docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
