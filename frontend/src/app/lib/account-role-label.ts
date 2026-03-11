import type { AccountRole } from "./types";

const ROLE_LABELS: Record<AccountRole, string> = {
  owner: "Gestor",
  editor: "Editor",
  viewer: "Visualizar Apenas",
};

export function getAccountRoleLabel(role: AccountRole | null): string {
  if (!role) return "-";
  return ROLE_LABELS[role];
}

