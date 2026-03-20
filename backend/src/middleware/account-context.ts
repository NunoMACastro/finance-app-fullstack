import type { NextFunction, Request, Response } from "express";
import { forbidden, unprocessable } from "../lib/api-error.js";
import { AccountMembershipModel } from "../models/account-membership.model.js";
import { UserModel } from "../models/user.model.js";
import { ensurePersonalAccountForUser } from "../modules/accounts/service.js";

const FINANCIAL_WRITE_ROLES = ["owner", "editor"] as const;
const FINANCIAL_READ_ROLES = ["owner", "editor", "viewer"] as const;

type AccountRole = "owner" | "editor" | "viewer";

function buildAccountContextMiddleware(strictHeader: boolean) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    void (async () => {
      const userId = req.auth?.userId;
      if (!userId) {
        forbidden("Contexto de utilizador em falta", "AUTH_CONTEXT_MISSING");
      }

      const user = await UserModel.findById(userId).select({ _id: 1, personalAccountId: 1 }).lean();
      if (!user) {
        forbidden("Contexto de utilizador em falta", "AUTH_CONTEXT_MISSING");
      }

      const personalAccountId = user.personalAccountId
        ? user.personalAccountId.toString()
        : await ensurePersonalAccountForUser(userId);
      const headerAccountId = req.header("x-account-id")?.trim() ?? "";
      const accountHeaderPresent = headerAccountId.length > 0;
      if (strictHeader && !accountHeaderPresent) {
        unprocessable("X-Account-Id obrigatório", "ACCOUNT_HEADER_REQUIRED");
      }
      const requestedAccountId = accountHeaderPresent ? headerAccountId : personalAccountId;

      const membership = await AccountMembershipModel.findOne({
        accountId: requestedAccountId,
        userId,
        status: "active",
      }).lean();

      if (!membership) {
        forbidden("Sem acesso a esta conta", "ACCOUNT_ACCESS_DENIED");
      }

      req.auth = {
        ...req.auth,
        userId,
        accountId: requestedAccountId,
        accountRole: membership.role as AccountRole,
        personalAccountId,
        accountHeaderPresent,
      };

      next();
    })().catch(next);
  };
}

export function requireAccountContext(req: Request, res: Response, next: NextFunction): void {
  return buildAccountContextMiddleware(false)(req, res, next);
}

export function requireStrictAccountContext(req: Request, res: Response, next: NextFunction): void {
  return buildAccountContextMiddleware(true)(req, res, next);
}

export function requireAccountRole(roles: readonly AccountRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.accountRole;
    if (!role || !roles.includes(role)) {
      forbidden("Sem permissão para esta operação", "ACCOUNT_ROLE_FORBIDDEN");
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
