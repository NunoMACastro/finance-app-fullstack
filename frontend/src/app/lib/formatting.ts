import type { UserProfile } from "./types";

type UserFormatting = Pick<UserProfile, "currency"> | null | undefined;

const MASKED_VALUE = "••••";
const DEFAULT_LOCALE = "pt-PT";
const DEFAULT_TIMEZONE = "Europe/Lisbon";

function getCurrency(user: UserFormatting): string {
  return user?.currency ?? "EUR";
}

export function formatCurrency(value: number, user: UserFormatting, hidden = false): string {
  if (hidden) {
    return MASKED_VALUE;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: getCurrency(user),
  }).format(value);
}

export function formatDateShort(dateValue: string, user: UserFormatting): string {
  void user;
  const date = new Date(dateValue);
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    timeZone: DEFAULT_TIMEZONE,
  });
}

export function formatMonthLong(monthKey: string, user: UserFormatting): string {
  void user;
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIMEZONE,
  });
}

export function formatMonthShort(monthKey: string, user: UserFormatting): string {
  void user;
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const date = new Date(year, month - 1, 1);
  return date
    .toLocaleDateString(DEFAULT_LOCALE, {
      month: "short",
      timeZone: DEFAULT_TIMEZONE,
    })
    .replace(".", "");
}
