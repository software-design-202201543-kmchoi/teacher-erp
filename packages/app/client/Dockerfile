# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN VITE_API_BASE_URL="" pnpm --filter client build

FROM nginx:alpine
COPY --from=builder /app/packages/app/client/dist /usr/share/nginx/html
COPY packages/app/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
