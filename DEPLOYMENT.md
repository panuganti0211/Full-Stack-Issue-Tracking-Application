# TrackFlow — Deployment Guide

This guide walks you through Docker, Supabase Edge Functions (email), CI/CD, and cloud hosting.

---

## 1. Local Development

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and keys from Supabase Dashboard → Settings → API

npm install
npm run dev
```

App runs at **http://localhost:3000**

---

## 2. Docker (Containerization)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

### Build & run

```bash
# Ensure .env has Supabase keys (used at build time for Vite)
npm run docker:build
npm run docker:up
```

Open **http://localhost:3000**

### Manual commands

```bash
docker compose build
docker compose up -d
docker compose down
```

### Files
| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage: Node build → nginx serve |
| `docker-compose.yml` | Local orchestration on port 3000 |
| `nginx.conf` | SPA routing + gzip + caching |

---

## 3. Supabase Edge Functions (Email + Invites)

### Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy functions

```bash
supabase functions deploy send-notification-email
supabase functions deploy invite-member-by-email
supabase functions deploy check-due-dates
```

### Set secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | e.g. `TrackFlow <onboarding@resend.dev>` |
| `APP_URL` | Your deployed app URL |
| `CRON_SECRET` | Random string for due-date cron |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-available in Edge Functions |

### Email notifications trigger on
- Task assignment
- @mention in comments
- Due date alerts (in-app + email)

### Schedule due-date cron (Supabase Dashboard → Database → Extensions → pg_cron)

Or use an external cron (e.g. GitHub Actions scheduled workflow) to POST:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/check-due-dates" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## 4. Google OAuth

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable Google, add Client ID + Secret from Google Cloud Console
3. Add redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. In Google Console, add authorized redirect URI above

---

## 5. Realtime (Comments & Notifications)

Supabase Dashboard → **Database** → **Replication** → enable for:
- `comments`
- `notifications`

---

## 6. CI/CD (GitHub Actions)

Workflow: `.github/workflows/ci-cd.yml`

### On every PR / push
- `npm ci` + `npm run build`

### On push to `main`
- Build & push Docker image to `ghcr.io`
- Optional GitHub Pages deploy

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_APP_URL` | Production URL |

### Optional: GitHub Pages
Set repository variable `ENABLE_GH_PAGES` = `true` and enable Pages from `gh-pages` branch.

---

## 7. Cloud Hosting Options

### Option A — Docker on any VPS (DigitalOcean, AWS EC2, etc.)

```bash
git clone YOUR_REPO
cd issue-tracker-pro
cp .env.example .env
# fill env vars
docker compose up -d --build
```

### Option B — Vercel / Netlify (static)

```bash
npm run build
# Deploy dist/ folder
# Set env vars in dashboard
```

### Option C — GitHub Container Registry

After CI runs on `main`, pull image:

```bash
docker pull ghcr.io/YOUR_USER/YOUR_REPO:latest
docker run -p 80:80 ghcr.io/YOUR_USER/YOUR_REPO:latest
```

---

## 8. Assessment Checklist

| Requirement | Status |
|-------------|--------|
| React frontend | ✅ |
| Supabase backend | ✅ |
| Email + Google auth | ✅ (configure providers) |
| Team invite by email | ✅ (edge function) |
| Kanban + List views | ✅ |
| Labels, P1–P4, due dates | ✅ |
| Email notifications | ✅ (Resend + edge function) |
| In-app notifications | ✅ |
| Share links | ✅ |
| RBAC | ✅ |
| Docker | ✅ |
| CI/CD pipeline | ✅ |
| Cloud deploy | ⚙️ Follow steps above |

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| Task create 400 error | Use P1–P4 priority, visibility `workspace` or `restricted` |
| Email not sending | Deploy edge function + set `RESEND_API_KEY` |
| Invite by email fails | Deploy `invite-member-by-email` function |
| Google login fails | Configure Google provider in Supabase |
| Docker build fails | Ensure `.env` has all `VITE_*` keys |
