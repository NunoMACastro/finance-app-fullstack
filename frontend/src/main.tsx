import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

const STORAGE_KEY = "finance_v2.theme";
const LEGACY_STORAGE_KEY = "finance_v2.theme_palette";

function normalizeThemePalette(value: string | null | undefined): string {
  if (
    value === "brisa" ||
    value === "calma" ||
    value === "aurora" ||
    value === "terra" ||
    value === "mare" ||
    value === "amber" ||
    value === "ciano"
  ) {
    return value;
  }
  if (value === "ocean") return "brisa";
  if (value === "forest") return "terra";
  if (value === "sunset") return "aurora";
  if (value === "graphite") return "calma";
  if (value === "ambar") return "amber";
  return "ciano";
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const initialTheme = normalizeThemePalette(stored);
  document.documentElement.setAttribute("data-theme", initialTheme);
  document.documentElement.removeAttribute("data-theme-palette");
  window.localStorage.setItem(STORAGE_KEY, initialTheme);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

createRoot(document.getElementById("root")!).render(<App />);
