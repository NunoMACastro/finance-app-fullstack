import { type UiVersion, normalizeUiVersion } from "./ui-version";

/**
 * Application Configuration
 *
 * Controls whether the app uses mock data or real API calls.
 *
 * To connect to a real Node.js backend:
 * 1. Set VITE_USE_MOCK=false in your .env file
 * 2. Set VITE_API_BASE_URL to your backend (e.g. "https://api.myapp.pt/v1")
 * 3. Ensure your backend implements the endpoints documented in api.ts
 * 4. Ensure CORS is configured on your backend to allow this frontend origin
 *
 * Environment variables (set in .env or .env.local):
 *   VITE_API_BASE_URL   → backend base URL (e.g. "http://localhost:3001/api/v1")
 *   VITE_USE_MOCK        → "true" | "false" (default: "false")
 *   VITE_UI_VERSION      → "v1" | "v2" (default: "v1")
 *   VITE_MAINTENANCE_MODE → "true" | "false" (default: "false")
 *   VITE_MAINTENANCE_TITLE → optional maintenance title
 *   VITE_MAINTENANCE_MESSAGE → optional maintenance message
 */

const uiVersion = normalizeUiVersion(import.meta.env.VITE_UI_VERSION as string | undefined, "v1") as UiVersion;

export const config = {
  /** When true, all API calls return mock data. Set to false to hit the real backend. */
  useMock: (import.meta.env.VITE_USE_MOCK ?? "false") === "true",

  /** Base URL for the real API. Ignored when useMock is true. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? "/api/v1",

  /** Request timeout in milliseconds */
  requestTimeout: 15_000,

  /** Token refresh: how many ms before expiry to proactively refresh (0 = only on 401) */
  tokenRefreshMargin: 60_000,

  /** UI version used by default at runtime; can be overridden with ?ui=v1|v2. */
  uiVersion,

  /** When true, the app shows maintenance screen instead of normal UI. */
  maintenanceMode: (import.meta.env.VITE_MAINTENANCE_MODE ?? "false") === "true",

  /** Optional maintenance texts shown in the lock screen. */
  maintenanceTitle: (import.meta.env.VITE_MAINTENANCE_TITLE as string) ?? "Estamos em manutencao",
  maintenanceMessage:
    (import.meta.env.VITE_MAINTENANCE_MESSAGE as string) ??
    "Voltamos em breve. Obrigado pela paciencia.",
} as const;
