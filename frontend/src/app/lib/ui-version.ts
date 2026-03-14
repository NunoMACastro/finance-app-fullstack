export type UiVersion = "v1" | "v2";

export const UI_VERSION_OVERRIDE_QUERY_KEY = "ui";
export const UI_VERSION_OVERRIDE_STORAGE_KEY = "finance_v2.ui_version_override";

export function parseUiVersion(value: string | null | undefined): UiVersion | null {
  if (value === "v1" || value === "v2") return value;
  return null;
}

export function normalizeUiVersion(value: string | null | undefined, fallback: UiVersion = "v1"): UiVersion {
  return parseUiVersion(value) ?? fallback;
}

export function resolveUiVersionFromRuntime(
  defaultVersion: UiVersion,
  params: URLSearchParams,
  storage?: Pick<Storage, "getItem" | "setItem">,
): UiVersion {
  const queryVersion = parseUiVersion(params.get(UI_VERSION_OVERRIDE_QUERY_KEY));
  if (queryVersion) {
    storage?.setItem(UI_VERSION_OVERRIDE_STORAGE_KEY, queryVersion);
    return queryVersion;
  }

  const storedVersion = parseUiVersion(storage?.getItem(UI_VERSION_OVERRIDE_STORAGE_KEY));
  return storedVersion ?? defaultVersion;
}
