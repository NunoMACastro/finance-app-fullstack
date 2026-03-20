import "express-serve-static-core";

type AccountRole = "owner" | "editor" | "viewer";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      sessionId?: string;
      accountId?: string;
      accountRole?: AccountRole;
      personalAccountId?: string;
      accountHeaderPresent?: boolean;
    };
  }
}

export {};
