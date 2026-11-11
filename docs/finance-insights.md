# Finance insights (budgets, subscriptions, review flag)

Backend and MCP support for: weekly money review, budget alarm, subscription hunter and
"can I afford X?", and the finance page that shows them.

## Rules

| Rule | Detail |
|---|---|
| Months | Calendar months in Asia/Jakarta, everywhere (`finance.insights.ts`). `GET /finance/summary` used the server's local month before. |
| Pay cycles | With `User.payday` set, budgets, alerts and the overview run from salary to salary (`packages/utils/src/salaryCycle.ts`). A cycle starts on the day a salary is logged (income in category `Salary`) that lands within 7 days before its expected payday or later; it runs until the next one, so a late salary makes the cycle longer. The payday only sets the expected date for "days left" and the reminder. A salary earlier than that window counts as extra income in the running cycle. Before any salary is logged, the cycle starts at the last expected payday. Budget alert keys become the cycle's start day. Subscriptions and charts stay on calendar dates. |
| Salary reminder | At 21:00, once payday has passed with no salary logged, the agent pushes "Has your salary arrived?" until one is. |
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
- `User.monthlyIncome`, `User.payday`

Apply after deploy, inside the api container:

```sh
pnpm --filter @noctis/db exec prisma db push
```

New columns are nullable or defaulted and the two tables are new, so nothing existing is rewritten.

## MCP tools (server 1.2.0)

| Tool | Purpose |
|---|---|
| `search_transactions` | Now filters by `category`, `from`/`to`, `minAmount`, `needsReview`; pages with `cursor`; returns `{ transactions, nextCursor }` with ids. |
| `add_transaction` | New optional `paymentMethod`, `needsReview`. Result carries `needsReview` and `budgetAlert` (80 / 100 / null). |
| `update_transaction` | Change category / title / review flag by id. |
| `get_spending_summary` | Totals for a range, grouped by category, merchant or day. |
| `get_month_overview` | Income, spend, remaining, days left, all budgets, `period` — for the current pay cycle or month, or a given calendar month. |
| `set_monthly_income` | Usual income and/or payday. |
| `log_salary` | Records salary arrival; opens a new pay cycle. One per day. |
| `list_budgets` / `set_budget` | Per-category monthly limits with usage. |
| `list_recurring` | Repeating charges and Subscriptions-category candidates. |
| `list_subscriptions` / `upsert_subscription` | The registry, each with this cycle's status, plus `dueSoon` per payment method. |

## REST (finance page)

| Route | Purpose |
|---|---|
| `GET /finance/overview` | Spent, wallet top-ups, income, remaining, days left, budgets. |
| `PUT /finance/income` | `{ monthlyIncome?, payday? }`, null clears. |
| `POST /finance/salary` | `{ amount, date? }` — logs salary, opens a pay cycle. |
| `PUT /finance/budgets` | `{ category, monthlyLimit }`, null removes. 409 for the top-up category. |
| `GET /finance/subscriptions` | Registry with status and `dueSoon`. |
| `PATCH /finance/:id` | `{ category?, title?, needsReview? }`. Choosing a category clears the review flag. |

## Finance page

- Summary tiles follow the spend rule: **Spent**, **Wallet top-ups** (shown, not counted), **Left of income** with the per-day allowance. Income and payday are edited on that tile; with a payday set, a banknote button logs salary and turns into a labelled "Salary in" button from three days before payday. It is income minus this month's spend — an allowance that starts over each month, not the bank balance.
- **Hide amounts** (page header) masks every money figure on the finance page and the dashboard as `Rp •••••`. Remembered per browser (`lib/amountsPrivacy.ts`); the server always renders masked so a hidden figure never flashes on load. Percentages and bar lengths stay visible.
- **Budgets** card: a bar per category, finance gold while there is room and the destructive tone once over. Add, edit and remove limits there.
- **Subscriptions** card: read-only. Registering one still goes through `upsert_subscription`.
- **Transactions**: the category chip on every row is a select. Rows with a guessed category show **Keep** to confirm it, and the **Needs category** filter lists only those.

The in-app AI chat writes transactions directly to the database, so `ai.service` re-checks every
budget after a chat turn that added one (`checkAllBudgetAlerts`).

## Checks

```sh
cd apps/api  && pnpm exec tsx src/modules/finance/finance.insights.check.ts
cd ai/agent  && pnpm exec tsx src/reviewReminder.check.ts && pnpm exec tsx src/salaryReminder.check.ts
cd apps/api  && pnpm exec tsx ../../packages/utils/src/salaryCycle.check.ts
cd apps/web  && pnpm dlx tsx src/features/finance/lib/finance.lib.check.ts
```
