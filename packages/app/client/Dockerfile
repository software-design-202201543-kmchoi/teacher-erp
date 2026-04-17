# syntax=docker/dockerfile:1
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace manifests and lockfile first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all packages (workspace deps must be resolvable)
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

WORKDIR /app/packages/app/client

EXPOSE 5173

# --host makes Vite listen on 0.0.0.0 so it is reachable from outside the container
CMD ["pnpm", "dev", "--host"]
