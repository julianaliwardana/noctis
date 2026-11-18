# Noctis MCP from the code editor (Claude Code, VS Code)

The same MCP endpoint Claude.ai uses also serves Claude Code and any other MCP client. No extra
server: each client connects to `https://noctis-api.julianwardana.dev/mcp` and signs in with OAuth
(see [mcp-oauth.md](./mcp-oauth.md)).

```
Claude Code (terminal / VS Code) ─┐
Claude.ai + scheduled tasks      ─┼──► /mcp  (OAuth access token per app) ──► Noctis
Other MCP clients                ─┘
```

## Access

- Every app signs in once (OAuth) and shows up under Profile → **Connected apps**, where it can be
  disconnected. There are no static tokens.
- Every call logs `mcpClient` as `oauth:<grant id>`.
- Wrong tokens are rate-limited per IP (Cloudflare's `CF-Connecting-IP`): after 20 in 10 minutes the
  IP gets `429` with `Retry-After` instead of `401`, and one warning is logged. A valid token is never
  refused — Claude calls from shared cloud IPs, so blocking a whole IP would let anyone lock Claude
  out. If Redis is down the limiter lets requests through. For floods, add a Cloudflare rate-limiting
  rule on `/mcp`.

## What clients get (server 1.6.0)

**Tools**

| Tool | Does |
|---|---|
| `list_tasks` | Open tasks soonest-due first, or done ones most recent first; filter by title/notes substring. |
| `complete_task` | Closes a task; a recurring one moves to its next due date instead (`rescheduled`). |
| `log_focus` | Records a *finished* focus session of N minutes. The web timer runs in the browser and only saves finished sessions, so there is no remote start/stop. |
| `add_task` | (from server health) adds a task, skipping an open duplicate. |
| `report_run` | Last step of every scheduled task: Claude's estimate of context/input/output tokens. See [agent-run-usage.md](./agent-run-usage.md). |
| `get_run_usage` | Token report per task and per day for a date range. |

**Resources** — attach as context (Claude Code: type `@`)

| URI | Content |
|---|---|
| `noctis://tasks/open` | Open tasks |
| `noctis://finance/period` | The current pay cycle: income, spend, left, budgets |
| `noctis://focus/today` | Today's focus sessions and total minutes (Jakarta day) |

**Prompts** — one-step recipes (Claude Code: the `/` menu, e.g. `/mcp__noctis__weekly_review`)

| Prompt | Arguments |
|---|---|
| `weekly_review` | — |
| `plan_my_day` | — |
| `can_i_afford` | `item`, `price` (text, e.g. `1.2jt`) |

A prompt is only text telling the model which tools to call; the logic stays in the tools. MCP
prompt arguments are always strings.

## Connect Claude Code (once per machine)

```bash
claude mcp add --scope user --transport http noctis https://noctis-api.julianwardana.dev/mcp
```

Then `/mcp` → noctis → Authenticate, and Allow in the browser. `--scope user` makes it available in
every project; the tokens stay in Claude Code, out of any repository. The Claude Code extension in
VS Code uses the same configuration.

## Checks

```sh
cd apps/api && pnpm exec tsx src/modules/mcp/mcp.auth.check.ts
```
