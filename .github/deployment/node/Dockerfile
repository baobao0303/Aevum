# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS assets
WORKDIR /app

COPY ./packages/backend/server /app
COPY ./packages/frontend/apps/web/dist /app/static
COPY ./packages/frontend/admin/dist /app/static/admin
COPY ./packages/frontend/apps/mobile/dist /app/static/mobile

# Keep server sourcemap for stacktraces, but don't ship frontend/node_modules sourcemaps.
ARG TARGETARCH
ARG TARGETVARIANT
# Needed for Prisma engine resolution (and potential engine download during cleanup).
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl ca-certificates && \
  rm -rf /var/lib/apt/lists/*

RUN ln -s /app/node_modules /node_modules && \
  mkdir -p /app/node_modules/.bin && \
  ln -sf ../prisma/build/index.js /app/node_modules/.bin/prisma && \
  chmod -R +x /app/node_modules/.bin /app/node_modules/@prisma/engines /app/node_modules/prisma/build 2>/dev/null || true && \
  node ./node_modules/prisma/build/index.js generate

RUN AFFINE_DOCKER_CLEAN=1 TARGETARCH="${TARGETARCH}" TARGETVARIANT="${TARGETVARIANT}" node ./scripts/docker-clean.mjs

FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=assets /app /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl libjemalloc2 && \
  rm -rf /var/lib/apt/lists/* && \
  ln -s /app/node_modules /node_modules

# Enable jemalloc by preloading the library
ENV LD_PRELOAD=libjemalloc.so.2

EXPOSE 3010

CMD ["sh", "-c", "node ./scripts/upgrade-config.js && exec node ./dist/main.js"]
