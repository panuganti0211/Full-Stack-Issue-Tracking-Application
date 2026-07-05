# TrackFlow — Full-Stack Issue Tracking Application

A production-ready issue tracker built with **React**, **Vite**, **Tailwind CSS**, and **Supabase**. Supports multi-workspace collaboration, Kanban and list views, role-based access control, email notifications, Google OAuth, Docker, and GitHub Actions CI/CD.

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/supabase-backend-3FCF8E?logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)

---

## Features

| Area | Details |
|------|---------|
| **Workspaces** | Create workspaces, switch between them, invite members |
| **Views** | Kanban board (drag-and-drop) and sortable list view |
| **Tasks** | Title, description, P1–P4 priority, due dates, sections, labels |
| **Visibility** | Workspace-wide or role-restricted tasks |
| **RBAC** | Admin, Project Manager, Developer, Tester, Viewer |
| **Collaboration** | Comments with @mentions, share links, team panel |
| **Notifications** | In-app + email (task assignment, mentions, due dates) |
| **Auth** | Email/password and Google OAuth |
| **Realtime** | Live comment threads and notification badges |
| **DevOps** | Docker, nginx, GitHub Actions, Supabase Edge Functions |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 5, Tailwind CSS, React Router |
| Forms | React Hook Form |
| Drag & drop | @dnd-kit |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| Email | Resend (via Edge Functions) |
| Container | Docker + nginx |
| CI/CD | GitHub Actions |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [npm](https://www.npmjs.com/)
- A [Supabase](https://supabase.com/) project
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for containerized runs)

---

## Quick Start (Local Dev)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd issue-tracker-pro
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:3000
```

Get keys from **Supabase Dashboard → Settings → API**.

### 3. Database setup

Run these SQL migrations in **Supabase Dashboard → SQL Editor** (in order):

1. `supabase/migrations/20250705_profiles_rls.sql` — profiles, RLS, signup trigger
2. `supabase/migrations/20250706_enable_realtime.sql` — realtime for comments & notifications

### 4. Run the app

```bash
npm run dev
```

Open **http://localhost:5173** (Vite dev server).

---

## Docker

Build and run with Docker (serves on port **3000**):

```bash
npm run docker:build
npm run docker:up
```

Open **http://localhost:3000**

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build the image |
| `npm run docker:up` | Start the container |
| `npm run docker:down` | Stop the container |

> Vite env vars are baked in at **build time**. Ensure `.env` is set before `docker compose build`.

---

## Supabase Edge Functions

Deploy email and invite functions:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase functions deploy send-notification-email
supabase functions deploy invite-member-by-email
supabase functions deploy check-due-dates
```

Set secrets in **Supabase → Edge Functions → Secrets**:

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | e.g. `TrackFlow <onboarding@resend.dev>` |
| `APP_URL` | Your app URL |
| `CRON_SECRET` | Random string for due-date cron |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup (Google OAuth, Realtime, CI/CD, cloud hosting).

---

## Google OAuth

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Set **User type** to **External** and add test users
3. Redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Enable Google in **Supabase → Authentication → Providers**
5. Set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` to redirect URLs

---

## Project Structure

```
├── src/
│   ├── components/   # UI, Kanban, tasks, team, layouts
│   ├── context/      # Auth & workspace providers
│   ├── pages/        # Route pages
│   ├── services/     # Supabase API layer
│   └── utils/        # RBAC, formatting, enrichment
├── supabase/
│   ├── functions/    # Edge Functions (email, invites, cron)
│   └── migrations/   # SQL migrations
├── .github/workflows/  # CI/CD & cron workflows
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## CI/CD (GitHub Actions)

Workflows run on push/PR to `main`:

- **ci-cd.yml** — `npm ci`, build, Docker image push to `ghcr.io`
- **cron-due-dates.yml** — daily due-date email trigger

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_APP_URL` | Production or preview URL |
| `CRON_SECRET` | Same value as Supabase edge secret |

Optional: set repository variable `ENABLE_GH_PAGES=true` to deploy `dist/` to GitHub Pages.

---

## Roles & Permissions

| Role | Create tasks | Edit content | Change status | Manage team |
|------|:---:|:---:|:---:|:---:|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ❌ |
| Developer | ✅ | Own/assigned | Own/assigned | ❌ |
| Tester | ❌ | ❌ | Assigned | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Run Docker container |
| `npm run docker:down` | Stop Docker container |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Task create fails (400) | Use priority `P1`–`P4`; visibility `workspace` or `restricted` |
| Section dropdown empty | Reload page; default sections auto-create on workspace load |
| Assignee shows "Unknown" | Run profiles migration; users re-login to sync profile |
| Email not sending | Deploy edge functions + set `RESEND_API_KEY` secret |
| Google login blocked | OAuth consent screen must be **External** with test users added |
| Realtime not updating | Run `20250706_enable_realtime.sql` migration |

---

## License

This project was built as a technical assessment submission.
