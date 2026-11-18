# Scheduled-task token reports and foreign-currency charges (server 1.6.0)

## Run usage: `report_run` / `get_run_usage`

Every Claude scheduled task (BCA import, weekly money review, subscription hunter, maverick health
check) ends by calling `report_run` with its own estimate of the tokens it used:

| Field | Meaning |
|---|---|
| `task` | The scheduled task's name, e.g. `BCA import` |
| `model` | e.g. `claude-sonnet-5-5` |
| `status` | `ok` / `partial` / `failed` |
| `contextTokens` | How full the context window is at the end of the run |
| `inputTokens` / `outputTokens` | Tokens read / written across the whole run |
| `summary` | One line on what the run did |

Claude can't read exact token counts from inside a claude.ai run, so the numbers are estimates —
good for spotting a task that got heavy. Tokens only, no price: the Pro plan doesn't bill per token,
and Anthropic's Models API carries no prices, so a cost figure would need a hand-kept price list.

`get_run_usage` (read-only) returns totals, a row per task and per day, failed-run count and the
latest runs for a date range (default: this Jakarta month). Context is reported as the peak
(`maxContextTokens`), not a sum.

Line to add at the end of each scheduled task prompt:

> Last step, always (even if nothing was found or something failed): call Noctis `report_run` with
> `task` = "<task name>", `model` = the model you are running as, `status`, your best estimate of
> `contextTokens`, `inputTokens` and `outputTokens` for this run, and a one-line `summary`. If the
> tool isn't available yet, skip this step.

## Foreign-currency charges

BCA debit-card emails for an overseas merchant show only the original amount, e.g.
`ANTHROPIC* CLAUDE SUB — USD 22,2`, never the rupiah that left the account. The import used to skip
these as "can't parse".

`add_transaction` now takes `originalAmount` + `originalCurrency` (ISO 4217). With `amount` left out
the server converts at today's market rate (open.er-api.com, cached 6 h in Redis), stores the
original next to the IDR amount, and flags the row `needsReview`. Correct it from the myBCA mutation
with `update_transaction { id, amount }` — entering the real amount on a foreign charge clears the
review flag. If the rate can't be fetched the call fails and asks for `amount` in IDR.

## Schema (additive)

- `Expense.originalAmount Float?`, `Expense.originalCurrency String?`
- new `AgentRun` table

After deploy, inside the api container:

```sh
pnpm --filter @noctis/db exec prisma db push
```
