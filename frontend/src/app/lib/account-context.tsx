import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { accountsApi } from "./api";
import { useAuth } from "./auth-context";
import {
  clearStoredActiveAccountId,
  getActiveAccountIdHeader,
  loadStoredActiveAccountId,
  setActiveAccountIdHeader,
  storeActiveAccountId,
} from "./account-store";
import type { AccountMember, AccountRole, AccountSummary, InviteCodeResponse } from "./types";

interface AccountState {
  accounts: AccountSummary[];
  activeAccountId: string | null;
  activeAccount: AccountSummary | null;
  activeAccountRole: AccountRole | null;
  isLoading: boolean;
  canWriteFinancial: boolean;
  setActiveAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
  createSharedAccount: (name: string) => Promise<AccountSummary>;
  joinByCode: (code: string) => Promise<AccountSummary>;
  generateInviteCode: (accountId: string) => Promise<InviteCodeResponse>;
  listMembers: (accountId: string) => Promise<AccountMember[]>;
  updateMemberRole: (accountId: string, userId: string, role: AccountRole) => Promise<AccountMember>;
  removeMember: (accountId: string, userId: string) => Promise<void>;
  leaveAccount: (accountId: string) => Promise<void>;
}

const AccountContext = createContext<AccountState | null>(null);

function pickNextActiveAccount(
  accounts: AccountSummary[],
  userPersonalAccountId: string,
  preferredAccountId?: string | null,
): string | null {
  if (accounts.length === 0) return null;

  if (preferredAccountId && accounts.some((account) => account.id === preferredAccountId)) {
    return preferredAccountId;
  }

  if (accounts.some((account) => account.id === userPersonalAccountId)) {
    return userPersonalAccountId;
  }

  const personal = accounts.find((account) => account.isPersonalDefault);
  if (personal) {
    return personal.id;
  }

  return accounts[0].id;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(
    getActiveAccountIdHeader(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const applyActiveAccount = useCallback(
    (nextAccountId: string | null) => {
      setActiveAccountId(nextAccountId);
      setActiveAccountIdHeader(nextAccountId);

      if (!user) return;

      if (nextAccountId) {
        storeActiveAccountId(user.id, nextAccountId);
      } else {
        clearStoredActiveAccountId(user.id);
      }
    },
    [user],
  );

  const refreshAccounts = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAccounts([]);
      applyActiveAccount(null);
      return;
    }

    setIsLoading(true);
    try {
      const nextAccounts = await accountsApi.list();
      setAccounts(nextAccounts);

      const stored = loadStoredActiveAccountId(user.id);
      const preferred = activeAccountId ?? stored;
      const nextActive = pickNextActiveAccount(nextAccounts, user.personalAccountId, preferred);
      applyActiveAccount(nextActive);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccountId, applyActiveAccount, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAccounts([]);
      setActiveAccountIdHeader(null);
      setActiveAccountId(null);
      return;
    }

    void refreshAccounts();
  }, [isAuthenticated, refreshAccounts, user]);

  const setActiveAccount = useCallback(
    (accountId: string) => {
      if (!accounts.some((account) => account.id === accountId)) {
        return;
      }
      applyActiveAccount(accountId);
    },
    [accounts, applyActiveAccount],
  );

  const createSharedAccount = useCallback(
    async (name: string) => {
      const account = await accountsApi.create(name);
      await refreshAccounts();
      applyActiveAccount(account.id);
      return account;
    },
    [applyActiveAccount, refreshAccounts],
  );

  const joinByCode = useCallback(
    async (code: string) => {
      const account = await accountsApi.joinByCode(code);
      await refreshAccounts();
      applyActiveAccount(account.id);
      return account;
    },
    [applyActiveAccount, refreshAccounts],
  );

  const generateInviteCode = useCallback(async (accountId: string) => {
    return accountsApi.generateInviteCode(accountId);
  }, []);

  const listMembers = useCallback(async (accountId: string) => {
    return accountsApi.listMembers(accountId);
  }, []);

  const updateMemberRole = useCallback(async (accountId: string, targetUserId: string, role: AccountRole) => {
    const updated = await accountsApi.updateMemberRole(accountId, targetUserId, role);
    await refreshAccounts();
    return updated;
  }, [refreshAccounts]);

  const removeMember = useCallback(async (accountId: string, targetUserId: string) => {
    await accountsApi.removeMember(accountId, targetUserId);
    await refreshAccounts();
  }, [refreshAccounts]);

  const leaveAccount = useCallback(async (accountId: string) => {
    await accountsApi.leave(accountId);
    await refreshAccounts();
  }, [refreshAccounts]);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );

  const activeAccountRole = activeAccount?.role ?? null;
  const canWriteFinancial = activeAccountRole === "owner" || activeAccountRole === "editor";

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        activeAccount,
        activeAccountRole,
        isLoading,
        canWriteFinancial,
        setActiveAccount,
        refreshAccounts,
        createSharedAccount,
        joinByCode,
        generateInviteCode,
        listMembers,
        updateMemberRole,
        removeMember,
        leaveAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
