FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/allocation/package.json packages/allocation/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder

ENV DATABASE_URL=postgresql://waypoint:waypoint@postgres:5432/waypoint?schema=public

COPY --from=dependencies /app ./
COPY . .

RUN pnpm db:generate
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @waypoint/database exec prisma migrate deploy && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then pnpm db:seed; fi && pnpm --filter @waypoint/web start"]
