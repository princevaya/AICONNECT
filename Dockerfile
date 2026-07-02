# -------------------------
# Base stage
# -------------------------
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN corepack enable

WORKDIR /app

# -------------------------
# Dependencies stage
# -------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm config set dangerously-allow-all-builds true
RUN pnpm install --frozen-lockfile

# -------------------------
# Build stage
# -------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time variables
ARG DATABASE_URL
ARG DIRECT_URL
ARG CHAT_DATABASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_LIVEKIT_URL

# Make them available during build
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_URL=${DIRECT_URL}
ENV CHAT_DATABASE_URL=${CHAT_DATABASE_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL}
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL}
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL}
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}

# Build app
RUN pnpm run build

# -------------------------
# Production stage
# -------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Create required directories
RUN mkdir -p \
  public/uploads/recordings \
  public/uploads/exports \
  storage/meeting/chats \
  storage/chat-system \
  storage/generated-images

# Copy build output + configs
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose app port
EXPOSE 3005

# Start app
CMD ["pnpm", "run", "start"]