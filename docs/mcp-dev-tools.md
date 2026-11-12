# Noctis MCP from the code editor (Claude Code, VS Code)

The same MCP endpoint Claude.ai uses also serves Claude Code and any other MCP client. No extra
server: each client connects to `https://noctis-api.julianwardana.dev/mcp` with its own token.

```
Claude Code (terminal / VS Code) ─┐
Claude.ai + scheduled tasks      ─┼──► /mcp  (bearer token per client) ──► Noctis
Other MCP clients                ─┘
```

## Tokens: one per client

```
MCP_TOKENS=claude-ai:<token>,mac:<token>
```

- Each token at least 32 characters (`openssl rand -hex 32`). A malformed list or a short token stops
  the api from starting, rather than leaving a weak endpoint.
- Revoke one client by removing its entry and redeploying; the others keep working.
- The older single `MCP_TOKEN` still works, as client `default`.
- Every call logs `mcpClient` with the name, so the api logs show who called.

## What clients get (server 1.4.0)

**Tools**

| Tool | Does |
|---|---|
| `list_tasks` | Open tasks soonest-due first, or done ones most recent first; filter by title/notes substring. |
| `complete_task` | Closes a task; a recurring one moves to its next due date instead (`rescheduled`). |
| `log_focus` | Records a *finished* focus session of N minutes. The web timer runs in the browser and only saves finished sessions, so there is no remote start/stop. |
| `add_task` | (from server health) adds a task, skipping an open duplicate. |

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
claude mcp add --scope user --transport http noctis \
  https://noctis-api.julianwardana.dev/mcp \
  --header "Authorization: Bearer <this machine's token>"
```

`--scope user` makes it available in every project and keeps the token in `~/.claude.json`, out of
any repository. The Claude Code extension in VS Code uses the same configuration. Check with `/mcp`.

## Checks

```sh
cd apps/api && pnpm exec tsx src/modules/mcp/mcp.auth.check.ts
```
