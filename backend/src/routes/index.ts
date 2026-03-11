import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { authRouter } from "../modules/auth/routes.js";
import { budgetsRouter } from "../modules/budgets/routes.js";
import { recurringRouter } from "../modules/recurring/routes.js";
import { statsRouter } from "../modules/stats/routes.js";
import { transactionsRouter } from "../modules/transactions/routes.js";

export const apiRouter = Router();

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Muitos pedidos de autenticacao. Tente novamente daqui a pouco.",
  },
});

apiRouter.use("/auth", authLimiter, authRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/budgets", budgetsRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/recurring-rules", recurringRouter);
