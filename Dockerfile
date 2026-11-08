FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/hello-function/package.json ./apps/hello-function/package.json

RUN npm ci

COPY apps/hello-function/tsconfig.json ./apps/hello-function/tsconfig.json
COPY apps/hello-function/tsconfig.production.json ./apps/hello-function/tsconfig.production.json
COPY apps/hello-function/src ./apps/hello-function/src
COPY scripts/clean-function-dist-production.mjs ./scripts/clean-function-dist-production.mjs

RUN npm run build:production --workspace hello-function

FROM node:24-bookworm-slim AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/hello-function/package.json ./apps/hello-function/package.json

RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY apps/hello-function/package.json ./apps/hello-function/package.json
COPY --from=build /app/apps/hello-function/dist-production ./apps/hello-function/dist-production

EXPOSE 8080

CMD ["node", "apps/hello-function/dist-production/local.server.js"]
