/**
 * Application Configuration
 *
 * The frontend runs against the real backend API.
 *
 * Environment variables (set in .env or .env.local):
 *   VITE_API_BASE_URL   → backend base URL (e.g. "http://localhost:3001/api/v1")
 *   VITE_MAINTENANCE_MODE → "true" | "false" (default: "false")
 *   VITE_MAINTENANCE_TITLE → optional maintenance title
 *   VITE_MAINTENANCE_MESSAGE → optional maintenance message
 */

export const config = {
  /** Base URL for the backend API. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? "/api/v1",

  /** Request timeout in milliseconds */
  requestTimeout: 15_000,

  /** Token refresh: how many ms before expiry to proactively refresh (0 = only on 401) */
  tokenRefreshMargin: 60_000,

  /** When true, the app shows maintenance screen instead of normal UI. */
  maintenanceMode: (import.meta.env.VITE_MAINTENANCE_MODE ?? "false") === "true",

  /** Optional maintenance texts shown in the lock screen. */
  maintenanceTitle: (import.meta.env.VITE_MAINTENANCE_TITLE as string) ?? "Estamos em manutencao",
  maintenanceMessage:
    (import.meta.env.VITE_MAINTENANCE_MESSAGE as string) ??
    "Voltamos em breve. Obrigado pela paciencia.",
} as const;
