# syntax=docker/dockerfile:1
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests and lockfile first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all packages (workspace deps must be resolvable)
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

WORKDIR /app/packages/app/server

EXPOSE 3001

CMD ["pnpm", "dev"]
