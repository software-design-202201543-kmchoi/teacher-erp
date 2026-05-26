# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=deps /app ./
WORKDIR /app/packages/app/server
EXPOSE 3001
CMD ["pnpm", "start"]
