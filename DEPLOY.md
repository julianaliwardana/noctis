# Deploying Noctis

Production runbook for the live instance at `noctis.julianwardana.dev`. For local
development setup, see [README.md](README.md). For *why* it's built this way — and how to
apply the same reasoning to other projects — see
[docs/deployment-concepts.md](docs/deployment-concepts.md).

## Architecture

One Oracle Cloud A1 VM runs everything via `docker-compose.prod.yml`:

```
                  Cloudflare edge (TLS)
                          │
              ┌───────────┴───────────┐
   noctis.julianwardana.dev   noctis-api.julianwardana.dev
              │                       │
              └───── Cloudflare Tunnel ─────┐
                                            │  (outbound-only)
  ┌─────────────────────────────────────────┴──────────────────┐
  │ Oracle A1 VM · docker compose network                      │
  │                                                            │
  │   cloudflared ──► web:3000  (Next.js)                      │
  │               └─► api:3001  (Fastify)                      │
  │                                                            │
  │   agent  (BullMQ nudge scheduler, no inbound port)         │
  │   postgres:5432   redis:6379   ← internal only             │
  └────────────────────────────────────────────────────────────┘
```

**Why a tunnel instead of opening ports:** `cloudflared` dials *out* to Cloudflare, so
the VM needs no inbound rules at all. That sidesteps Oracle's two independent firewalls
(VCN Security Lists *and* the local iptables rules Ubuntu images ship with), which is
where most of the time goes on OCI. TLS certificates and the DNS records come free with
it.

**Why one image for three services:** `api`, `agent`, and `web` are the same monorepo.
Compose builds `noctis:latest` once and runs it three times with different `command`s.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | Single-stage build: installs the workspace, generates the Prisma client, builds Next.js |
| `docker-compose.prod.yml` | The five services + `cloudflared` |
| `deploy.sh` | Pull, build tagged as the git SHA, restart |
| `.env.prod.example` | Template for the server's `.env` — copy, don't edit in place |
| `.dockerignore` | Keeps host `node_modules` (wrong architecture) out of the build context |

---

## First-time deploy

### 1. Push the deploy files

```bash
git add .dockerignore Dockerfile docker-compose.prod.yml deploy.sh .env.prod.example
git commit -m "chore: add production docker deploy"
git push
```

### 2. Create the Oracle VM

In the Oracle Cloud console → **Compute → Instances → Create instance**:

- Image: **Ubuntu 24.04**
- Shape: **Change shape → Ampere → VM.Standard.A1.Flex**, set to **2 OCPU / 12 GB**
- Add your SSH public key (`cat ~/.ssh/id_ed25519.pub`)
- Boot volume: **100 GB** (free tier allows 200 GB total)

> `Out of host capacity` is common on A1 — it's the most-requested free shape. Retry in a
> different Availability Domain, or retry over a few hours.

Then:

```bash
ssh ubuntu@<VM_IP>
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/julianaliwardana/noctis.git && cd noctis
```

✅ `docker ps` runs without `sudo` and without error.

### 3. Create the Cloudflare Tunnel

At [one.dash.cloudflare.com](https://one.dash.cloudflare.com):

1. **Networks → Tunnels → Create a tunnel** → connector type **Cloudflared** → name `noctis`
2. On the install screen, **copy the token** — the long string after `--token`. Save it for
   step 4. Do not run the command it shows; compose runs the connector for you.
3. Add two public hostnames:

   | Subdomain | Domain | Type | URL |
   |---|---|---|---|
   | `noctis` | `julianwardana.dev` | HTTP | `web:3000` |
   | `noctis-api` | `julianwardana.dev` | HTTP | `api:3001` |

   The URLs are compose service names, resolved on the internal Docker network.

✅ Cloudflare DNS now shows two proxied CNAMEs pointing at `*.cfargotunnel.com`. These are
created for you — no manual DNS entry.

### 4. Configure secrets

```bash
cp .env.prod.example .env
openssl rand -base64 32           # → JWT_SECRET
openssl rand -base64 24           # → POSTGRES_PASSWORD (avoid @ and : — they break the URL)
# The host has Docker but no Node, so borrow the image the build needs anyway:
docker run --rm node:22-slim npx -y web-push generate-vapid-keys  # → VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
nano .env
```

Five fields are easy to get wrong:

| Field | Requirement |
|---|---|
| `DATABASE_URL` | Password must match `POSTGRES_PASSWORD` exactly; host is `postgres`, **not** `localhost` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Must be byte-identical to `VAPID_PUBLIC_KEY` |
| `WEB_ORIGIN` | Exactly `https://noctis.julianwardana.dev` — no trailing slash, or CORS fails |
| `COOKIE_DOMAIN` | `julianwardana.dev` — a parent of both the web origin and the API, or the session cookies never reach one of them |
| `TUNNEL_TOKEN` | The token from step 3 |

`YOUTUBE_API_KEY` and `INNERTUBE_KEY` are optional.

AI runs through OmniRoute only: `AI_PROVIDER=omniroute`,
`OMNIROUTE_BASE_URL=https://omniroute.julianwardana.dev/v1`, `OMNIROUTE_API_KEY` = the `noctis`
key, `OMNIROUTE_MODEL=noctis` (the Z.ai-only combo). Chat and nudges both carry finance data, so
do not set `GEMINI_API_KEY`, `GROQ_API_KEY` or `ANTHROPIC_API_KEY` on the server.
Check from inside the stack (the slim image has no curl/wget, so use node):

```bash
docker compose exec api node -e 'fetch(process.env.OMNIROUTE_BASE_URL+"/models",{headers:{Authorization:"Bearer "+process.env.OMNIROUTE_API_KEY}}).then(r=>r.text()).then(console.log)'
```

### 5. Launch

```bash
./deploy.sh
```

The first build compiles Next.js on two ARM cores — expect **8–12 minutes**. Later builds
are faster: the Dockerfile copies package manifests before source, so the dependency
install stays cached unless a dependency actually changed.

Then create the schema:

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @noctis/db exec prisma db push
docker compose -f docker-compose.prod.yml ps
```

✅ All six services `Up`, `postgres` shows `(healthy)`.

### 6. Verify

Each check exercises one more layer, so work down in order:

1. `https://noctis.julianwardana.dev` loads over HTTPS → tunnel + web
2. Register and log in → web → api → postgres → JWT
3. Send an AI chat message → api → agent → OmniRoute (`noctis` combo)
4. Enable push notifications → VAPID keys match

---

## Routine operations

### Deploy a change

```bash
./deploy.sh
```

Builds the image tagged with the current git short SHA, restarts `api`/`agent`/`web`, and
prints the tags still available to roll back to.

### Roll back

Past builds stay in the local image store, so this is a restart, not a rebuild — seconds
rather than ten minutes:

```bash
docker image ls noctis                                        # find the previous SHA
TAG=abc1234 docker compose -f docker-compose.prod.yml up -d
```

Don't run `docker image prune -a` — it deletes the images you'd roll back to. Plain
`docker image prune` (no `-a`) only clears dangling layers and is safe.

### Schema change

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @noctis/db exec prisma db push
```

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f cloudflared
```

### Backup

Add once there's data worth keeping:

```bash
echo '0 3 * * * cd ~/noctis && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U noctis noctis | gzip > ~/backup-$(date +\%F).sql.gz' | crontab -
```

Restore: `gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U noctis noctis`

---

## Gotchas

**`NEXT_PUBLIC_*` is baked in at image build time.** Next.js inlines those into the browser
bundle, so they're `ARG`s in the `Dockerfile`, not runtime env. Changing
`NEXT_PUBLIC_API_URL` requires a rebuild (`./deploy.sh`); a restart silently keeps the old
value with no error to tell you why.

**Keep the API hostname one level deep.** Free Universal SSL covers `julianwardana.dev` and
`*.julianwardana.dev` only, so `api.noctis.julianwardana.dev` would fail the TLS handshake
(error 526) while `noctis-api.julianwardana.dev` is covered. That's also why `COOKIE_DOMAIN`
is the apex: it's the nearest common parent of the two sibling hosts.

**Postgres bakes `POSTGRES_PASSWORD` in on first start only.** It initialises the role when the
data directory is empty and never revisits it, so editing the password in `.env` after the first
`./deploy.sh` leaves the database on the old one — `prisma db push` then fails with
`P1000: Authentication failed`. Before there's data, drop the volume and start over:

```bash
docker compose -f docker-compose.prod.yml down -v && ./deploy.sh
```

After there's data, change the role instead:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U noctis -c "ALTER USER noctis PASSWORD '<new>';"
```

**CORS errors in the browser console** almost always mean `WEB_ORIGIN` doesn't exactly
match the site origin. It's parsed as a comma-separated allowlist in `apps/api/src/app.ts`.

**`TZ` is not optional.** Containers run UTC. The nudge cron patterns in
`ai/agent/src/scheduler.ts` are bare (`0 0 8 * * *`) so BullMQ parses them in local time,
and `setHours(0, 0, 0, 0)` sets day boundaries for habit streaks in
`apps/api/src/modules/habits/`. Without `TZ=Asia/Jakarta` the 08:00 nudge arrives at 15:00
and streaks roll over at 07:00. Nothing errors — the data is just quietly wrong.

**No Prisma migration history.** The project uses `db push`, which infers changes by diffing
— it can drop columns without warning. Run `pnpm db:migrate` locally to start a real
migration history before the data matters, then switch this runbook to `prisma migrate deploy`.

**`bcrypt` on arm64** should resolve a prebuilt binary. If `pnpm install` fails on it during
the image build, add to the `Dockerfile` above the install line:

```dockerfile
RUN apt-get update && apt-get install -y python3 make g++
```

**Docker vulnerability warnings on `node:22-slim`** are Debian base-image CVEs in packages
the app never invokes. `node:22-alpine` reports fewer, but musl has no `bcrypt` prebuilds,
so you'd trade the warning for a compiler toolchain in the image.

**Don't run Ollama here.** Two OCPUs with no GPU makes CPU-only inference unusably slow.
Keep `AI_PROVIDER=omniroute` in production; Ollama stays a local-dev option.

**`apps/api` has no build step.** It runs under `tsx` in production. Compiling it with
`tsc` produced extensionless ESM imports and left the workspace TS packages
(`@noctis/db`, `@noctis/agent`) uncompiled, so `node dist/app.js` failed with
`ERR_MODULE_NOT_FOUND`. The `build` script was removed rather than fixed — `tsx` costs a
few hundred ms at boot and nothing after.

---

## Operating the server from a phone

Claude Code runs *on maverick* and the phone is a window into it, so it sees the real
checkout, the compose stack and the logs. Setup is once; after that it's one command.

### Install (once)

```bash
sudo apt install -y tmux
curl -fsSL https://claude.ai/install.sh | bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
exec $SHELL
claude --version
```

The native installer ships a self-contained arm64 binary — the box has no Node and doesn't
need one. It does **not** add `~/.local/bin` to `PATH` for you; without that line `claude`
is `command not found`.

Then sign in. Remote Control needs a Pro or Max login — an `ANTHROPIC_API_KEY` won't do:

```bash
cd ~/noctis && claude     # /login, open the printed URL on your laptop, paste the code back
```

Accept the workspace-trust prompt while you're in `~/noctis`. Trust is never saved for a
home directory, so a server started from `~` refuses to connect.

### Run

```bash
tmux new -s cc                              # or: tmux a -t cc
cd ~/noctis && claude remote-control --name noctis
```

Press **space** for a QR code and scan it with the Claude app. `tmux` is what keeps the
server alive after you close the SSH connection.

| Key | Effect |
|---|---|
| `space` | show/hide the QR code |
| `w` | toggle spawn mode between `same-dir` and `worktree` |
| `Ctrl-b` `d` | detach — server keeps running |
| `Ctrl-C` | **stops the server** |

### Gotchas

**`Ctrl-C` is not how you leave.** It kills the server, and the environment link then fails
with *couldn't open the environment*. Detach with `Ctrl-b` `d`, or just close the terminal —
tmux survives a dropped SSH connection either way.

**VS Code's integrated terminal swallows `Ctrl-b`** (it's the toggle-sidebar shortcut), so
detaching appears to do nothing. Close the tab instead, or from another terminal:
`ssh julian@maverick tmux detach-client -s cc`.

**"Connect to GitHub / choose an environment" means you're in the wrong flow.** That's
Claude Code on the web, which runs on Anthropic's infrastructure and has no access to this
box. Remote Control is reached through the QR code or the
`claude.ai/code?environment=env_...` link the server prints — sessions created inside that
environment spawn on maverick.

**`-c` only works if a previous server left a session behind.** After a `Ctrl-C` the
sessions are usually archived, and `claude remote-control -c` fails with *No recent session
found*. Drop the flag and start a new one.

**`same-dir` spawn mode points every session at the live checkout.** A session on your phone
can rewrite `.env`, `git checkout`, or run `./deploy.sh` against production, and it has no
idea the box is production. Use `worktree` mode (press `w`) if you want remote sessions
isolated until you merge.

**Idle costs nothing.** The server holds an outbound websocket and makes no model calls
until you send a message. What spends tokens is a task left running, not a session left open.

**tmux dies on reboot.** Nothing restarts the server automatically; re-run the two commands
above. A systemd user unit plus `loginctl enable-linger julian` would fix it — not worth it
until the box actually reboots.
