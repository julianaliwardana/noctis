# Deployment, from first principles

Notes on *why* deployments are shaped the way they are, using Noctis as the worked
example. [DEPLOY.md](../DEPLOY.md) tells you what to type; this explains what it means,
so the knowledge transfers to the next thing you ship.

---

## The four questions

Every deployment — a static blog or a bank — answers the same four questions. Docker,
Kubernetes, Vercel, and tunnels are just different answers to them.

```
1. BUILD      How does source code become a running process?
2. INGRESS    How does a request from the internet reach that process?
3. STATE      Where does data live, and what survives a redeploy?
4. CONFIG     How do secrets get in without living in the code?
```

If you can answer these for a system, you can deploy it.

---

## 1. BUILD — source to running process

Three shapes exist. Noctis uses all three, which is normal.

| Shape | What runs | In Noctis |
|---|---|---|
| **Interpreted** | The source, directly | `api`, `agent` — `tsx src/app.ts` |
| **Compiled artifact** | A build output | `web` — `next build` → `.next/` |
| **Image** | A frozen filesystem + process | `noctis:<sha>` |

### Build-time vs run-time

The distinction that explains more deployment bugs than anything else.

```
BUILD TIME                          RUN TIME
─────────────────────               ─────────────────────
happens once, on a builder          happens on every container start
values are BAKED IN                 values are READ FRESH
to change: rebuild                  to change: restart

NEXT_PUBLIC_API_URL                 DATABASE_URL, REDIS_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY        JWT_SECRET, GEMINI_API_KEY
NEXT_PUBLIC_CDN_URL                 WEB_ORIGIN, VAPID_PRIVATE_KEY
```

**The rule that generalizes:** anything that executes *in a user's browser* is decided at
build time, because you are shipping a file. Anything that executes *on your server* can
be decided at run time, because the process reads its own environment.

That's why `NEXT_PUBLIC_API_URL` is an `ARG` in the Dockerfile and `DATABASE_URL` is not.
The same trap appears as `VITE_*`, `REACT_APP_*`, and `PUBLIC_*` in other frameworks.

**Security corollary:** a build-time browser variable is published. It ends up in a
JavaScript file any visitor can read. Never put a secret behind a `NEXT_PUBLIC_` prefix —
note that `VAPID_PUBLIC_KEY` is exposed and `VAPID_PRIVATE_KEY` is not, which is the
whole reason the key pair is split.

### Layer caching

Docker builds in layers. Each instruction is one layer, reused from cache if its inputs
are unchanged. Change one thing and that layer **plus every layer after it** rebuilds.

This is why the Dockerfile copies manifests before source:

```dockerfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/        # ...and the other five
RUN pnpm install --frozen-lockfile          # cached until a dep changes
COPY . .                                    # source busts only from here down
RUN pnpm --filter @noctis/web build
```

The earlier version had `COPY . .` first, which meant a one-line CSS edit reinstalled
every dependency and recompiled `bcrypt` — about four wasted minutes per deploy on two
ARM cores.

**Principle: order Dockerfile instructions from least- to most-frequently-changing.**

Note the manifests are listed one per line. `COPY apps/*/package.json apps/` looks
tempting but Docker flattens wildcards onto a single destination, so the files overwrite
each other.

---

## 2. INGRESS — internet to process

A request must cross from the public internet to a process on a private port. There are
four ways:

```
A. DIRECT          browser ──→ :443 on your VM
                   Simple. You own TLS, certs, and the firewall.

B. REVERSE PROXY   browser ──→ Caddy/nginx/Traefik :443 ──→ app :3000
                   One public port, many apps behind it. The default choice.

C. TUNNEL          browser ──→ Cloudflare ──╮
                                            ╰── outbound conn ──→ app
                   ← Noctis. Zero open ports.

D. MANAGED         browser ──→ platform load balancer ──→ your container
                   Vercel / Cloud Run / Fly. You never see the network.
```

Noctis uses **C** because Oracle Cloud has two independent firewalls — VCN Security Lists
*and* the local iptables rules its Ubuntu images ship with — and getting a port through
both is the single biggest time sink on OCI. On a normal VPS (Hetzner, DigitalOcean),
**B** with Caddy would be the better answer: automatic Let's Encrypt in about four lines.

### Where TLS terminates

"Terminate" means decrypt. Something has to hold the certificate and turn HTTPS into HTTP.

For Noctis, **Cloudflare's edge terminates TLS**. From there to the container, traffic is
plain HTTP travelling inside the tunnel's own encrypted connection. That is why the
tunnel ingress rules read `http://web:3000` and not `https://` — pointing them at `https`
produces certificate errors that look mysterious for hours.

### Binding address

```
127.0.0.1:3001   only this machine can reach it
0.0.0.0:3001     anything that can route here can reach it
```

Inside Docker, every container is its own "machine." Bind to `127.0.0.1` and even a
sibling container cannot reach you. This is the most common cause of "works locally, 502
in production." `apps/api/src/app.ts` correctly listens on `0.0.0.0`.

### Publishing a port is a separate decision

`ports: ["5432:5432"]` punches a hole from the host to the container.
`docker-compose.prod.yml` has **no** `ports:` entries at all — services talk over Docker's
internal network and `cloudflared` dials out. The only thing listening on the VM's public
IP is `sshd`.

Adding a port "just to debug" and forgetting it is how databases end up indexed on Shodan.

---

## 3. STATE — what survives

> **Containers are cattle. Volumes are pets.**

A container must be destroyable at any moment with zero data loss. Anything you would
miss goes in a volume or an external service.

```
DESTROYED on redeploy              SURVIVES redeploy
──────────────────────             ──────────────────────
container filesystem               named volumes (postgres_data, redis_data)
in-memory state                    bind mounts
files written to container disk    external object storage (S3/R2)
```

**The trap:** if the app ever writes a user upload to local disk, that file dies on the
next deploy. This is what object storage is for — and why `NEXT_PUBLIC_CDN_URL` points
somewhere else.

**Statelessness unlocks scaling.** You cannot run two copies of a process holding state in
memory. The `api` keeps state in Postgres and Redis, so it is already stateless and could
be replicated tomorrow. The `agent` is **not** replicable — two schedulers means duplicate
nudges. That asymmetry is normal for workers and worth remembering.

**Backups are a third, separate thing.** A volume protects against redeploys. It does not
protect against `DROP TABLE`, disk corruption, or Oracle reclaiming an idle free-tier
instance. Only an off-machine copy does.

### Background workers are state too

The `agent` container runs a BullMQ scheduler whose job definitions live in Redis, not in
the container. That has two consequences worth generalizing:

- **It self-heals.** `startScheduler()` re-upserts the three schedules on every boot, so
  wiping Redis costs you only in-flight jobs, not the schedule itself.
- **It does not scale horizontally.** Two `agent` replicas means two workers pulling the
  same queue — fine — but the queue is shared, so jobs aren't duplicated. The real limit
  is that scaling a worker is safe only when the job itself is idempotent. Sending a push
  notification is not.

**Your environment is state, too.** Containers default to **UTC**, while your laptop is
not. Anything reading "local time" — cron patterns, `setHours(0,0,0,0)`, log timestamps,
`toLocaleString()` — changes behaviour the moment it's containerized, with no error to
warn you. Noctis sets `TZ=Asia/Jakarta` in `.env` for exactly this reason.

**The general lesson:** the bugs that survive deployment aren't the ones that crash. They
are the ones where the container's *defaults* differ from your machine's — timezone,
locale, file encoding, `ulimit`, DNS resolution order. Crashes get found in minutes; wrong
timestamps get found in weeks.

---

## 4. CONFIG — secrets without hardcoding

The governing principle is [12-Factor](https://12factor.net/config) factor III: config
lives in the environment, not the code.

The test: **could you make this repo public right now without leaking anything?**

```
IN GIT                        NOT IN GIT
──────────────                ──────────────
.env.prod.example             .env
docker-compose.prod.yml       (the real secrets)
Dockerfile, deploy.sh
```

The hierarchy, worst to best:

1. Hardcoded in source — leaks the instant the repo moves
2. **`.env` on the server ← Noctis is here.** Correct for one app, one operator.
3. Platform secret store — Docker secrets, Fly secrets, Vercel env vars
4. Managed secrets with rotation and audit — Vault, AWS Secrets Manager

Level 2 is genuinely right here. Move up when more than one person needs access, or when
you need to prove who read what.

### One file, two mechanisms

Worth understanding, because it confuses people:

```
.env ──┬── ${VAR} interpolation ──→ build args, POSTGRES_*, TUNNEL_TOKEN, TAG
       │   (compose auto-reads .env from the compose file's directory)
       │
       └── env_file: .env ────────→ injected as env vars into api/agent/web
```

The first runs at **build**, the second at **start**. That split is exactly why
`NEXT_PUBLIC_*` behaves differently from everything else in the same file.

---

## What "production" adds beyond "it runs"

Getting it running is roughly 60% of the work.

| Concern | How Noctis handles it |
|---|---|
| Restart on crash | `restart: unless-stopped` |
| Start ordering | `pg_isready` healthcheck + `condition: service_healthy` |
| Rollback | Git-SHA image tags — see below |
| Logs | `docker compose logs`, ephemeral — lost on `down` |
| Backups | `pg_dump` cron, only if you set it up |
| Monitoring | None. You find out by visiting the site. |

### Why images get tagged

`deploy.sh` builds `noctis:<git-sha>` and re-points `noctis:latest` at it. Rollback is
then a restart, not a rebuild:

```bash
TAG=abc1234 docker compose -f docker-compose.prod.yml up -d
```

Ten seconds instead of ten minutes with a broken site in between.

This is the real reason production setups push to a container registry — not ceremony,
but so **every past version still exists and can be started instantly**. Rollback speed
matters more than deploy speed, because rollback happens when things are already on fire.

Consequence: `docker image prune -a` deletes your rollback targets. Use
`docker image prune` (without `-a`) to clear dangling layers only.

---

## Choosing a platform next time

```
Static site or SPA, no backend?
  └─→ Cloudflare Pages / Netlify. Free, git-push, done. Don't rent a VM for this.

One stateless service, bursty traffic, don't want to think about servers?
  └─→ Cloud Run / Fly.io / Railway / Render.
      Scales to zero; near-zero cost when idle.
      Cost: cold starts, and managed databases get expensive.

Needs a database + background workers + a flat predictable bill?
  └─→ One VM + docker compose.  ← Noctis, correctly.
      ~$0-10/mo, one file, no lock-in.
      Cost: you own the updates, the backups, and the pager.

Multiple teams, multiple apps, real HA requirements?
  └─→ Kubernetes. Not before. It solves problems you don't have and
      bills you a full-time operations job to do it.
```

The common mistake is jumping two rungs too high. A single VM running compose serves far
more traffic than people expect — comfortably tens of thousands of daily users for an app
of this shape.

---

## When a deploy breaks: check in this order

Work outside-in. Each step rules out one layer.

```
1. Is the container running?
   docker compose -f docker-compose.prod.yml ps
   → "Restarting" means crash-looping

2. Why did it die?
   docker compose -f docker-compose.prod.yml logs api
   → the answer is here ~90% of the time

3. Can containers see each other?
   docker compose -f docker-compose.prod.yml exec api ping postgres

4. Is the app actually listening?
   docker compose -f docker-compose.prod.yml exec api curl localhost:3001

5. Does the proxy reach the app?
   docker compose -f docker-compose.prod.yml logs cloudflared

6. Is it browser-side?
   DevTools → Network + Console
   → CORS, mixed content, or a stale baked-in NEXT_PUBLIC_ value
```

Never guess. Each layer works or doesn't, independently testable. Most "mysterious"
failures are someone jumping to step 6 when the answer was sitting in step 2.

---

## The compressed version

- **Build-time vs run-time** explains more bugs than any other distinction
- **Order Dockerfiles** least-changing → most-changing, for cache
- **Bind `0.0.0.0`**, expose nothing you don't have to
- **Containers disposable, volumes precious**, backups are a third thing
- **Config in the environment** — the repo should be safe to open-source
- **Tag images** — rollback speed beats deploy speed
- **Debug outside-in**, one layer at a time
