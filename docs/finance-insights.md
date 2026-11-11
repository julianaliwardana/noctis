# Finance insights (budgets, subscriptions, review flag)

Backend and MCP support for: weekly money review, budget alarm, subscription hunter and
"can I afford X?". The UI (budget screen, inline category edit, income field) is not in yet —
until then budgets, income and subscriptions are set through the MCP tools.

## Rules

| Rule | Detail |
|---|---|
| Months | Calendar months in Asia/Jakarta, everywhere (`finance.insights.ts`). `GET /finance/summary` used the server's local month before. |
| Spend | Expenses minus refunds (income rows titled `Refund — …`). |
| Wallet top-ups | Category `Top-up` is **not** spend. What the wallet pays for is logged as its own transaction (`paymentMethod: "gopay"`), so counting the top-up too would double it. |
| Budget alarm | Noctis pushes (and stores a nudge) when a category crosses 80% and again at 100% of its monthly limit. Once per threshold per month; jumping past 100% sends only the 100% push; deleting or refunding does not re-arm it. |
| Needs review | `Expense.needsReview` marks a guessed category. Set automatically for a transfer filed under `Other` to a person with no settled history, or explicitly by the caller. Cleared by choosing a category or confirming with `needsReview: false`. |
| Evening reminder | The agent's 21:00 job pushes "N transactions need a category" when any are waiting. |
| Recurring | Same title and amount in ≥ 2 months, at most 2 charges per month. More than that is a habit, not a subscription. |
| Subscription status | `paid` (a matching charge from 3 days before the billing date on), `upcoming`, `due` (billing date to 2 days after), `missing`. |

## Schema (additive)

- `Budget` — one per category (`categoryId` unique, cascades on category delete), `monthlyLimit`, `alerted80Month`, `alerted100Month`
- `Subscription` — `name`, `expectedAmount`, `billingDay`, `matchTitle`, `paymentMethod`, `note`, `active`
- `Expense.paymentMethod`, `Expense.needsReview`, index on `(userId, date)`
- `User.monthlyIncome`

Apply after deploy, inside the api container:

```sh
pnpm --filter @noctis/db exec prisma db push
```

New columns are nullable or defaulted and the two tables are new, so nothing existing is rewritten.

## MCP tools (server 1.1.0)

| Tool | Purpose |
|---|---|
| `search_transactions` | Now filters by `category`, `from`/`to`, `minAmount`, `needsReview`; pages with `cursor`; returns `{ transactions, nextCursor }` with ids. |
| `add_transaction` | New optional `paymentMethod`, `needsReview`. Result carries `needsReview` and `budgetAlert` (80 / 100 / null). |
| `update_transaction` | Change category / title / review flag by id. |
| `get_spending_summary` | Totals for a range, grouped by category, merchant or day. |
| `get_month_overview` | Income, spend, remaining, days left, all budgets. |
| `set_monthly_income` | Income used by the overview. |
| `list_budgets` / `set_budget` | Per-category monthly limits with usage. |
| `list_recurring` | Repeating charges and Subscriptions-category candidates. |
| `list_subscriptions` / `upsert_subscription` | The registry, each with this cycle's status, plus `dueSoon` per payment method. |

## Checks

```sh
cd apps/api  && pnpm exec tsx src/modules/finance/finance.insights.check.ts
cd ai/agent  && pnpm exec tsx src/reviewReminder.check.ts
```
