# 🧩 Local Development Guide — Next.js Project (using pnpm)

---

## **1. Prerequisites**

Make sure the following are installed:

- **Node.js** ≥ 18.x

  ```bash
  node -v
  ```

- **pnpm** ≥ 9.x

  ```bash
  npm install -g pnpm
  pnpm -v
  ```

- **Git**

  ```bash
  git --version
  ```

---

## **2. Clone the Repository**

```bash
git clone https://github.com/mosphet1/aiconnect
cd aiconnect
```

---

## **3. Install Dependencies**

Use **pnpm** to install dependencies:

```bash
pnpm install
```

This creates a local `.pnpm-store` and links dependencies efficiently.

---

## **4. Setup Environment Variables**

Create a `.env.local` file in the project root:

```bash
cp .env.example .env
```

Then update it with your local configuration:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=your_database_url_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
```

> **Note**
> The dashboard scheduler now persists meetings in Postgres. The API handlers will automatically create the `meeting_rooms` table the first time they run, but you still need a reachable Postgres instance and a valid `DATABASE_URL`.

---

## **5. Development Commands**

| Task                    | Command       | Description                          |
| ----------------------- | ------------- | ------------------------------------ |
| Start Dev Server        | `pnpm dev`    | Run the app in development mode      |
| Build for Production    | `pnpm build`  | Create an optimized production build |
| Start Production Server | `pnpm start`  | Serve the built app locally          |
| Lint Code               | `pnpm lint`   | Check for linting issues             |
| Format Code             | `pnpm format` | Format files (if configured)         |

---

## **6. Git Workflow**

**Check Remote:**

```bash
git remote -v
```

**Create a New Branch:**

```bash
git checkout -b feature/your-branch-name
```

**Stage and Commit Changes:**

```bash
git add .
git commit -m "feat: add new UI components"
```

**Push Branch to Remote:**

```bash
git push origin feature/your-branch-name
```

**Open Pull Request:**
Go to your GitHub repository → **Compare & pull request**.

---

## **7. Common Issues**

**Q: `pnpm: command not found`**
→ Install pnpm globally:

```bash
npm install -g pnpm
```

**Q: `next` not found**
→ Add missing dependencies:

```bash
pnpm add next react react-dom
```

**Q: Environment variables not loading**
→ Ensure `.env.local` exists and restart the dev server.

---

## **8. Recommended VS Code Setup**

Install these extensions for a better DX:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- shadcn/ui Snippets (if used)

---

## **9. Type Checking and Tests**

Run TypeScript checks:

```bash
pnpm type-check
```

Run tests (if configured):

```bash
pnpm test
```
