# Server health (maverick)

A daily Claude scheduled task checks the server Noctis runs on and files a Noctis task only when
something is wrong.

```
Claude scheduled task ──► Noctis MCP (bearer token) ──► server_health
                                                    └─► add_task   (only when a check fails)
```

No new public endpoint: health is an MCP tool behind the existing MCP tokens (`MCP_TOKENS` / `MCP_TOKEN`), so nothing about the
server is reachable without it, and the Dokploy API stays private.

## What is checked

Measured from inside the api container. Docker shares the host's `/proc` and root disk, so disk,
memory, load and uptime are the host's.

| Check | ok | warn | critical |
|---|---|---|---|
| Disk (`/`) | < 85% used | ≥ 85% | ≥ 95% |
| Memory (`MemAvailable`) | ≥ 10% available | < 10% | < 5% |
| Load (1 min, per core) | < 2 | ≥ 2 | — |
| Database | answers < 1 s | slow (≥ 1 s) | unreachable |
| Redis | answers | — | unreachable |
| Agent heartbeat | < 10 min old | — | missing or older |
| Bank import | newest bank-email transaction < 3 days old | ≥ 3 days, or none | — |

Every probe runs in parallel with a 3 s timeout, so a sick dependency gives a red check instead of
a hung call. If the tool can't be reached at all, the API itself is down — the scheduled task
reports that in its push notification, since it then can't file a Noctis task either.

The agent writes `noctis:agent:heartbeat` to Redis every minute (1 h expiry), so a stopped agent
shows as missing rather than stale forever.

Not covered: the state of other containers on maverick and Cloudflare tunnel health beyond
"the API answered". Reading other containers would need the Docker socket in the api container,
which would hand it control of the host.

## MCP tools (server 1.3.0)

| Tool | Purpose |
|---|---|
| `server_health` | The checks above, each `ok` / `warn` / `critical`, plus the overall `level`. |
| `add_task` | Adds a Noctis task; returns `exists` instead when an unfinished task has the same title, so a daily check never piles up duplicates. |

## Checks

```sh
cd apps/api && pnpm exec tsx src/modules/health/health.checks.check.ts
```
