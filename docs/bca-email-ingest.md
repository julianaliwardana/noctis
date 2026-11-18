# BCA email → Noctis (via Claude)

Claude reads BCA "Internet Transaction Journal" emails through its Gmail connector, picks or
creates a category, and logs each one through the Noctis MCP endpoint. Runs as a Claude
scheduled task, three times a day (12:00, 18:00, 23:00 WIB).

```
Gmail (connector) ──► Claude ──► POST https://noctis-api.julianwardana.dev/mcp
                                   list_categories · create_category · search_transactions
                                   find_imported · add_transaction
```

Several clients can connect with their own tokens; see [mcp-dev-tools.md](mcp-dev-tools.md).
Budgets, subscriptions, summaries and the review flag built on top of this are described in
[finance-insights.md](finance-insights.md). `search_transactions` now returns
`{ transactions, nextCursor }` rather than a bare array.

## Pieces in this repo

| Where | What |
|---|---|
| `apps/api/src/modules/mcp/` | Stateless Streamable HTTP MCP server on `POST /mcp`, bearer-token auth |
| `packages/db/prisma/schema.prisma` | `Expense.source`, `Expense.externalId`, unique `(userId, externalId)` |
| `apps/api/src/modules/finance/finance.repository.ts` | `createImported`, `findByExternalId(s)`, `search` |

The endpoint is **off** unless `API_PUBLIC_URL` (OAuth) and `MCP_USER_ID` (or the older `MCP_USER_EMAIL`)
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
   API_PUBLIC_URL=https://noctis-api.julianwardana.dev
   MCP_USER_ID=<your Noctis user id — see DEPLOY.md, "MCP is bound by account id">
   ```
4. Check it from anywhere: `curl -si -X POST https://noctis-api.julianwardana.dev/mcp` should answer
   `401` with a `WWW-Authenticate` header that names `resource_metadata`.
5. Claude → Customize → Connectors → Add custom connector with the URL
   `https://noctis-api.julianwardana.dev/mcp`, no header and no client ID. Connect, tick write, Allow
   (see [mcp-oauth.md](mcp-oauth.md)).
6. Gmail: create the label `noctis-imported` (Claude can do this too).
7. Create the scheduled task with the prompt below (12:00, 18:00, 23:00 WIB). The live prompt in Claude has grown since (debit-card emails, Google Play receipts, refunds, USD charges); treat the one below as the starting point.

## Scheduled task prompt

> Import my BCA transactions into Noctis.
>
> 1. Gmail: search `from:bca@bca.co.id subject:"Internet Transaction Journal" -label:noctis-imported newer_than:3d`.
>    BCA emails get grouped into threads — open each thread and collect every message id.
> 2. Noctis `find_imported` with those message ids; ignore the ones already imported.
> 3. For each remaining email with `Status : Successful`, read:
>    - **amount**: `Total Payment` if present, else `Pay Amount` / `Transfer Amount` / `Amount` — fees included. IDR, plain number.
>      A charge in another currency (debit-card email `Nilai Transaksi : USD 22,2`) is **not** skipped: send
>      `originalAmount` = 22.2 and `originalCurrency` = "USD" and leave `amount` out — Noctis converts it and
>      flags it for review (see [agent-run-usage.md](agent-run-usage.md)).
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
> 9. Last step, always: Noctis `report_run` with `task` = "BCA import" and your token estimates.
