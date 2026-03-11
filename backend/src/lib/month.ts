const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function assertMonthKey(value: string): void {
  if (!MONTH_REGEX.test(value)) {
    throw new Error("Invalid month key. Expected YYYY-MM");
  }
}

export function isMonthKey(value: string): boolean {
  return MONTH_REGEX.test(value);
}

export function monthFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(month: string): { year: number; monthIndex: number } {
  assertMonthKey(month);
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return { year, monthIndex: monthNumber - 1 };
}

export function monthToDate(month: string, day = 1): Date {
  const { year, monthIndex } = parseMonthKey(month);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), daysInMonth);
  return new Date(Date.UTC(year, monthIndex, safeDay));
}

export function shiftMonth(month: string, offset: number): string {
  const { year, monthIndex } = parseMonthKey(month);
  const d = new Date(Date.UTC(year, monthIndex + offset, 1));
  return monthFromDate(d);
}

export function monthsBetweenInclusive(fromMonth: string, toMonth: string): string[] {
  const result: string[] = [];
  let current = fromMonth;

  while (current <= toMonth) {
    result.push(current);
    current = shiftMonth(current, 1);
    if (result.length > 240) {
      throw new Error("Month interval too large");
    }
  }

  return result;
}

export function lastNMonthsEndingAt(endingMonth: string, n: number): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    months.push(shiftMonth(endingMonth, -i));
  }
  return months;
}
