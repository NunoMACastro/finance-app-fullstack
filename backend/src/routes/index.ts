import { Router } from "express";
import { accountsRouter } from "../modules/accounts/routes.js";
import { authRouter } from "../modules/auth/routes.js";
import { budgetsRouter } from "../modules/budgets/routes.js";
import { incomeCategoriesRouter } from "../modules/income-categories/routes.js";
import { recurringRouter } from "../modules/recurring/routes.js";
import { statsRouter } from "../modules/stats/routes.js";
import { transactionsRouter } from "../modules/transactions/routes.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/accounts", accountsRouter);
apiRouter.use("/income-categories", incomeCategoriesRouter);
apiRouter.use("/transactions", transactionsRouter);
apiRouter.use("/budgets", budgetsRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/recurring-rules", recurringRouter);
