import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../lib/api-error.js";
import { AccountMembershipModel } from "../models/account-membership.model.js";
import { ensurePersonalAccountForUser } from "../modules/accounts/service.js";

const FINANCIAL_WRITE_ROLES = ["owner", "editor"] as const;
const FINANCIAL_READ_ROLES = ["owner", "editor", "viewer"] as const;

type AccountRole = "owner" | "editor" | "viewer";

export function requireAccountContext(req: Request, _res: Response, next: NextFunction): void {
  void (async () => {
    const userId = req.auth?.userId;
    if (!userId) {
      forbidden("Contexto de utilizador em falta", "AUTH_CONTEXT_MISSING");
    }

    const personalAccountId = await ensurePersonalAccountForUser(userId);
    const requestedAccountId = req.header("x-account-id")?.trim() || personalAccountId;

    const membership = await AccountMembershipModel.findOne({
      accountId: requestedAccountId,
      userId,
      status: "active",
    }).lean();

    if (!membership) {
      forbidden("Sem acesso a esta conta", "ACCOUNT_ACCESS_DENIED");
    }

    req.auth = {
      userId,
      accountId: requestedAccountId,
      accountRole: membership.role as AccountRole,
      personalAccountId,
    };

    next();
  })().catch(next);
}

export function requireAccountRole(roles: readonly AccountRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.accountRole;
    if (!role || !roles.includes(role)) {
      forbidden("Sem permissao para esta operacao", "ACCOUNT_ROLE_FORBIDDEN");
    }

    next();
  };
}

export function requireFinancialWriteAccess(req: Request, res: Response, next: NextFunction): void {
  return requireAccountRole(FINANCIAL_WRITE_ROLES)(req, res, next);
}

export function requireFinancialReadAccess(req: Request, res: Response, next: NextFunction): void {
  return requireAccountRole(FINANCIAL_READ_ROLES)(req, res, next);
}
