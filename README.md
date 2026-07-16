# Noctis

A personal productivity app — tasks, habits, a Pomodoro timer, finance tracking, an
encrypted password manager, and an AI assistant — built as a pnpm monorepo.

## What you need to prepare

Everything below runs **on your own machine**. Postgres and Redis are not third-party
services you sign up for — they're just software containers started locally by
`docker-compose.yml`. Nothing here requires an account unless you explicitly choose a
cloud AI provider (see step 4).

| Requirement | What it's for | Do you need to sign up anywhere? |
|---|---|---|
| Node.js + pnpm | Runs everything | No |
| Docker | Runs Postgres + Redis locally | No |
| Postgres | Stores your tasks, habits, expenses, etc. | No — it's a local container |
| Redis | Backs BullMQ (see below) | No — it's a local container |
| BullMQ | A Node.js library (already in the code) that schedules the 3x-daily AI nudge jobs, using Redis as its queue | No — it's just a library, not a service |
| An AI provider | Powers the AI chat + nudges | Only if you pick Groq or Claude instead of the free local Ollama option |

## Setup, step by step

### 1. Install prerequisites

- **Node.js** 20+ and **pnpm**: `corepack enable` (Node ships with this) or `npm i -g pnpm`
- **Docker**: [docker.com](https://docker.com) — needed to run Postgres and Redis locally

### 2. Configure `.env`

`.env` is gitignored, so on a fresh clone it won't exist yet — copy the template:

```bash
cp .env.example .env
```

The defaults already match `docker-compose.yml` (`DATABASE_URL`, `REDIS_URL`), so
Postgres/Redis need no changes. Things you should still set:

- `JWT_SECRET` / `JWT_REFRESH_SECRET` — replace the placeholder text with random
  values: `openssl rand -hex 32`.
- `AI_PROVIDER` — defaults to `ollama` (free, runs locally, no account). To use a
  cloud provider instead:
  - `AI_PROVIDER=groq` + `GROQ_API_KEY` from a free account at
    [console.groq.com](https://console.groq.com)
  - `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY` from a paid account at
    [console.anthropic.com](https://console.anthropic.com)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — optional, only needed for push
  notifications. Generate with `npx web-push generate-vapid-keys` and also copy the
  public key into `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Leave both blank and push is simply
  skipped at runtime — the app won't crash.

### 3. Start Postgres and Redis

From the project root:

```bash
docker compose up -d
```

This starts both containers in the background, using the credentials baked into
`docker-compose.yml` (which match the `DATABASE_URL`/`REDIS_URL` defaults in
`.env.example`). Check they're up:

```bash
docker compose ps
```

### 4. Install dependencies (from the root only — never inside a package folder)

```bash
pnpm install
```

`bcrypt` needs a native binary built for your platform — this is already allow-listed
via `pnpm.onlyBuiltDependencies` in the root `package.json`, so `pnpm install` builds
it automatically. If you ever see `Cannot find module '.../bcrypt_lib.node'`, run
`pnpm rebuild bcrypt`.

### 5. Set up the database

```bash
pnpm --filter @noctis/db exec prisma generate   # generates the typed Prisma client
pnpm db:push                                     # applies the schema to Postgres
```

### 6. If using Ollama (the default AI provider)

```bash
curl -fsSL https://ollama.com/install.sh | sh   # installs the Ollama daemon (needs sudo)
ollama pull qwen2.5:7b                           # downloads the model (~5GB)
```

Ollama runs as a background service once installed — no need to keep a terminal open
for it.

### 7. Run the app

```bash
pnpm dev       # starts apps/web (localhost:3000) and apps/api (localhost:3001)
pnpm ai:dev    # separate process — the nudge scheduler (needs Redis running)
```

Visit `http://localhost:3000` — it redirects to `/login`. There's no separate signup
service: click **"Create an account"** to register directly against your own local API
(email + password, stored in your own Postgres).

## Project structure

```
apps/
  web/        Next.js 15 frontend (PWA)
  api/        Fastify backend, modular monolith
packages/
  db/         Prisma schema + generated client (@noctis/db)
  types/      Shared TypeScript interfaces (@noctis/types)
  utils/      Shared helpers: crypto, formatting (@noctis/utils)
ai/
  agent/      LLM provider abstraction, nudge scheduler, chat handler (@noctis/agent)
```

## Common commands

```bash
pnpm dev            # web + api, in parallel
pnpm ai:dev          # AI nudge scheduler
pnpm build           # build all workspaces
pnpm lint             # lint all workspaces
pnpm type-check       # type-check all workspaces
pnpm db:studio        # Prisma Studio — browse your local data
```

## Known gaps

- The frontend never calls `POST /notifications/subscribe`, so push notifications
  won't fire yet even with VAPID keys configured — that UI wiring hasn't been built.
- The passwords vault's encryption salt lives in `localStorage`, not a server-managed
  key-wrapping scheme — fine for single-device personal use, would need revisiting for
  multi-device sync.
