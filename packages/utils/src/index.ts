export function safeParseJSON(raw: string): unknown | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

export function formatCurrency(amount: number, currency = "IDR"): string {
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = "id-ID"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
// Named, not `export *`: this package is loaded as CommonJS, where a star re-export hides the names from ESM importers.
export { SALARY_CATEGORY, currentSalaryCycle, cycleStarts, expectedPayday } from "./salaryCycle";
export type { SalaryCycle } from "./salaryCycle";
