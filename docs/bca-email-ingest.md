# BCA email → Noctis (via Claude)

Claude reads BCA "Internet Transaction Journal" emails through its Gmail connector, picks or
creates a category, and logs each one through the Noctis MCP endpoint. Runs as a Claude
scheduled task (hourly).

```
Gmail (connector) ──► Claude ──► POST https://noctis-api.julianwardana.dev/mcp
                                   list_categories · create_category · search_transactions
                                   find_imported · add_transaction
```

Budgets, subscriptions, summaries and the review flag built on top of this are described in
[finance-insights.md](finance-insights.md). `search_transactions` now returns
`{ transactions, nextCursor }` rather than a bare array.

## Pieces in this repo

| Where | What |
|---|---|
| `apps/api/src/modules/mcp/` | Stateless Streamable HTTP MCP server on `POST /mcp`, bearer-token auth |
| `packages/db/prisma/schema.prisma` | `Expense.source`, `Expense.externalId`, unique `(userId, externalId)` |
| `apps/api/src/modules/finance/finance.repository.ts` | `createImported`, `findByExternalId(s)`, `search` |

The endpoint is **off** unless `MCP_TOKEN` and `MCP_USER_ID` (or the older `MCP_USER_EMAIL`)
are set. Every tool acts as that one account; no tool takes a user id. Prefer `MCP_USER_ID`: an
email binding breaks the moment you change your login email.

`add_transaction` is idempotent on `externalId` (the Gmail message id) — a re-run returns
`duplicate`, never a second row. It refuses unknown categories, so new categories only appear
through an explicit `create_category` call.

## Setup

1. `pnpm install` (adds `@modelcontextprotocol/sdk` to the lockfile).
2. Schema — two nullable columns + one unique index, non-destructive:
   - local: `pnpm db:push`
   - server, after deploy: `pnpm --filter @noctis/db exec prisma db push` inside the api container
3. Server env:
   ```
   MCP_TOKEN=<openssl rand -hex 32>
   MCP_USER_ID=<your Noctis user id — see DEPLOY.md, "MCP is bound by account id">
   ```
4. Check it from anywhere:
   ```sh
   curl -s https://noctis-api.julianwardana.dev/mcp \
     -H "Authorization: Bearer $MCP_TOKEN" \
     -H "content-type: application/json" \
     -H "accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
   ```
   Expect a JSON result with `"serverInfo":{"name":"noctis"...}`. No token → 401.
5. Claude → Settings → Connectors → Add custom connector:
   - URL: `https://noctis-api.julianwardana.dev/mcp`
   - Request header: `Authorization` = `Bearer <MCP_TOKEN>`
6. Gmail: create the label `noctis-imported` (Claude can do this too).
7. Create the scheduled task with the prompt below (hourly).

## Scheduled task prompt

> Import my BCA transactions into Noctis.
>
> 1. Gmail: search `from:bca@bca.co.id subject:"Internet Transaction Journal" -label:noctis-imported newer_than:3d`.
>    BCA emails get grouped into threads — open each thread and collect every message id.
> 2. Noctis `find_imported` with those message ids; ignore the ones already imported.
> 3. For each remaining email with `Status : Successful`, read:
>    - **amount**: `Total Payment` if present, else `Pay Amount` / `Transfer Amount` / `Amount` — fees included. IDR, plain number.
>    - **date**: `Transaction Date`, Jakarta time, send as ISO with `+07:00`.
>    - **title**:
>      - QRIS / NFC Payment → merchant from `Payment to`, cleaned to a readable brand ("IDM INDOMARET D" → "Indomaret", "MRT JAKARTA - QRIS TAP 2" → "MRT Jakarta").
>      - QRIS Transfer / Transfer to BCA Account → "Transfer to <Beneficiary Name, title case>", plus " — <Remarks>" when remarks exist.
>      - Virtual Account → the product, e.g. "GoPay top-up".
> 4. Category:
>    - First `search_transactions` with the merchant/person name. If it was categorized before, reuse that category.
>    - Otherwise pick the best fit from `list_categories`, using the remarks as a hint ("laundry julian" → laundry).
>    - Only if nothing reasonably fits, `create_category` with a short English Title Case name. Never a near-duplicate of an existing one.
>    - E-wallet top-ups (GoPay, OVO, DANA, ShopeePay) → category "Top-up".
>    - Transfers to a person with no remarks and no history → "Other".
> 5. `add_transaction` with `externalId` = the Gmail message id, `source` = "bca-email", `type` = "expense".
> 6. After `created` or `duplicate`, add the Gmail label `noctis-imported` to that message.
> 7. Skip anything that isn't Successful or that you can't parse, and list it in the summary.
> 8. End with a short summary: how many added, total IDR, any new categories, anything skipped.
>    If nothing new, say so in one line.
