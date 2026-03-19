import type { ThemePalette } from "../lib/types";

export const THEME_OPTIONS: Array<{ value: ThemePalette; label: string }> = [
  { value: "brisa", label: "Brisa" },
  { value: "calma", label: "Calma" },
  { value: "aurora", label: "Aurora" },
  { value: "terra", label: "Terra" },
  { value: "mare", label: "Maré" },
  { value: "amber", label: "Ambar" },
  { value: "ciano", label: "Ciano" },
];

export const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BRL", label: "BRL - Real brasileiro" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

export const SELECT_CLASS_NAME =
  "h-12 w-full rounded-2xl border-0 bg-surface-soft px-4 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export const PROFILE_FIELD_GROUP_CLASS = "space-y-1.5";
export const PROFILE_FIELD_LABEL_CLASS = "text-sm text-muted-foreground";
export const PROFILE_INPUT_CLASS =
  "h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30";

export function formatSessionDate(value: string): string {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}
