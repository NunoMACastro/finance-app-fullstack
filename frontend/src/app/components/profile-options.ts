import type { ThemePalette } from "../lib/types";

export const THEME_OPTIONS: Array<{ value: ThemePalette; label: string }> = [
  { value: "brisa", label: "Brisa" },
  { value: "calma", label: "Calma" },
  { value: "aurora", label: "Aurora" },
  { value: "terra", label: "Terra" },
];

export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BRL", label: "BRL - Real brasileiro" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

export const SELECT_CLASS_NAME =
  "h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground";

export function formatSessionDate(value: string): string {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}
