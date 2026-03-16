# Deploy Frontend on Vercel and Backend on Render

This project is a single Next.js codebase with UI and API routes (`app/api/*`).

Use two deployments from the same repo:
- Vercel: frontend app (routes + UI)
- Render: backend API host (`/api/*`)

A conditional rewrite in `next.config.ts` now forwards `/api/*` from Vercel to Render when `NEXT_PUBLIC_API_BASE_URL` is set.

## 1) Deploy Backend on Render

Create a new **Web Service** on Render.

- Root directory: project root (`aiconnect/aiconnect-01-main`)
- Build command: `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm build`
- Start command: `pnpm start`
- Environment: `Node`
- Node version: `20` (recommended)

Render command input tips:
- Enter commands without wrapping quotes. Use `pnpm start`, not `'pnpm start'` or `"pnpm start"`.
- If the build log shows `bash: line 1: ': command not found`, it usually means an extra quote was saved in the Build Command.

Add backend environment variables in Render:
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`
- `HUGGINGFACE_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (or `AWS_DEFAULT_REGION`)
- `AWS_S3_BUCKET`
- `RESEND_API_KEY` (if email is used)
- Any other app secrets currently used in local `.env`

Important:
- Do **not** set `NEXT_PUBLIC_API_BASE_URL` on Render backend.
- Keep backend URL public over HTTPS (example: `https://aiconnect-api.onrender.com`).

## 2) Deploy Frontend on Vercel

Create a new Vercel project from the same repository and same root directory.

Add frontend environment variables in Vercel:
- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Any other `NEXT_PUBLIC_*` variables required by the UI

How it works:
- Frontend code still calls relative endpoints like `/api/meeting/...`
- On Vercel, rewrite sends these requests to Render backend
- On local/backend deployments, rewrite is disabled and local API routes are used

## 3) Clerk/Auth Domain Setup

In Clerk dashboard:
- Add Vercel domain as allowed frontend origin
- Add Render domain as allowed backend/api origin if needed
- Configure redirect URLs for sign-in/sign-up callbacks for Vercel domain

## 4) CORS and Cookies Notes

Because frontend and backend are on different domains:
- Prefer token-based auth headers where applicable
- If cookie/session auth is used for custom endpoints, ensure cross-site cookie settings are compatible (`Secure`, `SameSite=None`) and CORS allows Vercel domain

## 5) Verify After Deployment

From the Vercel app:
- Open browser devtools network tab
- Confirm `/api/*` requests return from Render domain
- Test key flows:
  - Sign in / sign up
  - Meeting create/join
  - Chat send/upload
  - Scheduler CRUD
  - Image generation

## 6) Optional: Avoid Double Runtime Cost

Both deployments currently run the full Next app, but only:
- Vercel is used for frontend traffic
- Render is used as API target

Later, you can reduce cost by extracting API into a dedicated backend service (Express/Fastify/Nest) and keep only frontend on Vercel.
