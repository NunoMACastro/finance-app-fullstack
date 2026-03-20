export function isMonthKey(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export function currentUtcMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function getMonthDateBounds(monthKey: string): { start: string; end: string } {
  const { year, month } = parseMonthKey(monthKey);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}
