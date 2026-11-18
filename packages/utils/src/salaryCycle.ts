/** Pay cycles that follow the salary: one starts when a salary is logged; the payday is only the expectation. Asia/Jakarta, UTC+7. */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Income in this category is salary; anything else (a bonus filed as "Bonus") never starts a cycle. */
export const SALARY_CATEGORY = "Salary";

/** The next payday is the first one at least this far after a cycle's start. */
const MIN_CYCLE_DAYS = 14;
/** A salary up to this many days before its expected payday still opens the new cycle. Earlier, it is extra income in the running one. */
const EARLY_WINDOW_DAYS = 7;

interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

function jakartaDay(date: Date): CalendarDay {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Month overflow rolls over (month 13 → January next year). */
function jakartaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function startOfJakartaDay(date: Date): Date {
  const { year, month, day } = jakartaDay(date);
  return jakartaMidnight(year, month, day);
}

/** The payday (day clamped to the month's length) in the month `offset` months from `year`/`month`. */
function paydayIn(year: number, month: number, offset: number, payday: number): Date {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  return jakartaMidnight(y, m, Math.min(Math.max(payday, 1), daysInMonth(y, m)));
}

/** When the salary after a cycle that started on `start` is expected. */
export function expectedPayday(start: Date, payday: number): Date {
  const { year, month } = jakartaDay(start);
  const earliest = start.getTime() + MIN_CYCLE_DAYS * DAY_MS;
  for (let offset = 0; ; offset += 1) {
    const candidate = paydayIn(year, month, offset, payday);
    if (candidate.getTime() > earliest) return candidate;
  }
}

/** Start of every cycle, oldest first: each salary that lands near its expected payday opens one. */
export function cycleStarts(salaryDates: Date[], payday: number): Date[] {
  const starts: Date[] = [];
  for (const date of [...salaryDates].sort((a, b) => a.getTime() - b.getTime())) {
    const day = startOfJakartaDay(date);
    const last = starts[starts.length - 1];
    if (!last || day.getTime() >= expectedPayday(last, payday).getTime() - EARLY_WINDOW_DAYS * DAY_MS) {
      starts.push(day);
    }
  }
  return starts;
}

export interface SalaryCycle {
  /** Jakarta midnight the running cycle began. */
  start: Date;
  /** When the next salary is expected. */
  expectedNext: Date;
  /** False when no salary has ever been logged and `start` is just the last expected payday. */
  fromSalary: boolean;
  /** The expected payday has come and no salary has been logged since. */
  salaryDue: boolean;
  daysLate: number;
  /** Days until the expected payday, today included; 0 once it is due. */
  daysLeft: number;
}

/** The cycle `now` falls in. Salaries dated after `now` are ignored. */
export function currentSalaryCycle(salaryDates: Date[], payday: number, now: Date): SalaryCycle {
  const starts = cycleStarts(
    salaryDates.filter((date) => date.getTime() <= now.getTime()),
    payday,
  );
  const today = startOfJakartaDay(now);

  let start = starts[starts.length - 1];
  const fromSalary = start !== undefined;
  if (!start) {
    const { year, month } = jakartaDay(now);
    const thisMonth = paydayIn(year, month, 0, payday);
    start = thisMonth.getTime() <= today.getTime() ? thisMonth : paydayIn(year, month, -1, payday);
  }

  const expectedNext = expectedPayday(start, payday);
  const untilPayday = Math.round((expectedNext.getTime() - today.getTime()) / DAY_MS);

  return {
    start,
    expectedNext,
    fromSalary,
    salaryDue: fromSalary && untilPayday <= 0,
    daysLate: Math.max(0, -untilPayday),
    daysLeft: Math.max(0, untilPayday),
  };
}
