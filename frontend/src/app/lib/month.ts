export function isMonthKey(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export function currentUtcMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthKeyFromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function formatMonthKeyUtcLong(monthKey: string, locale = "pt-PT"): string {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getUtcDaysInMonth(monthKey: string): number {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getUtcDaysRemainingInMonth(monthKey: string, now = new Date()): number {
  const { year, month } = parseMonthKey(monthKey);
  const monthIndex = month - 1;
  const lastDay = getUtcDaysInMonth(monthKey);

  if (now.getUTCFullYear() === year && now.getUTCMonth() === monthIndex) {
    return Math.max(lastDay - now.getUTCDate() + 1, 1);
  }

  const targetMonthStart = Date.UTC(year, monthIndex, 1);
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  if (targetMonthStart > currentMonthStart) {
    return lastDay;
  }

  return 0;
}

export function getMonthDateBounds(monthKey: string): { start: string; end: string } {
  const lastDay = getUtcDaysInMonth(monthKey);
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}
