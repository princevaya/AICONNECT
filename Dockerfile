# Base stage for Node and PNPM
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate prisma client and build Next.js
RUN pnpm run postinstall
RUN pnpm run build

# Production runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

# Create storage and upload directories with correct permissions
RUN mkdir -p public/uploads/recordings public/uploads/exports storage/meeting/chats storage/chat-system storage/generated-images

# Copy necessary files for runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./next.config.js || true
COPY --from=builder /app/next.config.ts ./next.config.ts || true

EXPOSE 3005

CMD ["pnpm", "run", "start"]
