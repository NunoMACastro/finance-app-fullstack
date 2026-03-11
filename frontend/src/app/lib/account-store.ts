const ACTIVE_ACCOUNT_STORAGE_PREFIX = "finance_v2.active_account";

let activeAccountIdHeader: string | null = null;

function storageKey(userId: string): string {
  return `${ACTIVE_ACCOUNT_STORAGE_PREFIX}:${userId}`;
}

export function setActiveAccountIdHeader(accountId: string | null): void {
  activeAccountIdHeader = accountId;
}

export function getActiveAccountIdHeader(): string | null {
  return activeAccountIdHeader;
}

export function loadStoredActiveAccountId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(userId));
}

export function storeActiveAccountId(userId: string, accountId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), accountId);
}

export function clearStoredActiveAccountId(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId));
}
