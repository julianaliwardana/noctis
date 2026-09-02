FROM node:22-slim
RUN npm i -g pnpm@10.30.0
WORKDIR /app

# Baked into the client bundle at build time, so they must be args, not env_file.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL

# Manifests first: this layer (and the ~4min install below) stays cached until a
# dependency actually changes, instead of on every commit. Listed explicitly because
# Docker flattens `apps/*/package.json` onto a single destination file.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY ai/agent/package.json ai/agent/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
RUN pnpm install --frozen-lockfile

# Source changes only invalidate from here down.
COPY . .
# prisma.config.ts resolves DATABASE_URL from a .env that isn't (and shouldn't be) in the image.
# `generate` never connects, so any syntactically valid URL satisfies it.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    pnpm --filter @noctis/db exec prisma generate
RUN pnpm --filter @noctis/web build

ENV NODE_ENV=production
