# Deployment Guide

This guide details how to deploy the application on your server using Docker and Docker Compose. Following the S3 removal updates, all user meeting recordings, exports, and chat attachments are stored locally on the server inside persistent Docker volumes.

---

## Prerequisites

1. **Docker**: Install Docker on your server.
2. **Docker Compose**: Install Docker Compose (version 2.0 or higher).

---

## Storage & Volume Requirements

The application stores all files on the local filesystem. To prevent data loss when updating or restarting containers, **three persistent volumes** are defined in `docker-compose.yml`:

| Volume Name | Container Path | Purpose |
| :--- | :--- | :--- |
| `uploads_data` | `/app/public/uploads` | Stores meeting recordings and file exports. |
| `storage_data` | `/app/storage` | Stores chat messages and attachment files. |
| `db_data` | `/var/lib/postgresql/data` | Stores the PostgreSQL database tables. |

---

## Step 1: Configure Environment Variables

Create a `.env` file in the root directory. Copy `.env.example` or reuse your current settings:

```ini
# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard

# Databases (If using the dockerized postgres db service)
DATABASE_URL=postgresql://postgres:postgres@db:5432/aiconnect?schema=public
DIRECT_URL=postgresql://postgres:postgres@db:5432/aiconnect?schema=public

# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

# SMTP settings (Gmail)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

---

## Step 2: Build and Deploy

Run the following command to build the Docker image and start both the application and database services in detached background mode:

```bash
docker compose up -d --build
```

---

## Step 3: Run Database Migrations

Once the database container is healthy and running, sync the tables and database schema by pushing the prisma definition:

```bash
docker compose exec app pnpm prisma db push --accept-data-loss
```

---

## Verification & Health Check

### 1. View Service Status
Check if both the app and database containers are online and running:
```bash
docker compose ps
```

### 2. View Server Logs
To check application boot logs or debug runtime issues, run:
```bash
docker compose logs -f app
```

### 3. Open the App
Navigate to `http://<your-server-ip>:3000` to verify the login screen, dashboard, and recordings tab render correctly.

---

## Auto-Deletion & Cleanup Details
- Recordings are set to expire **30 days** after creation.
- The server automatically deletes expired recording video files from `public/uploads/recordings/` and removes their metadata from the database when listing recordings on the dashboard. No manual cron configuration is required.
