import { ArrowDownRight, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  OverlayBody,
  OverlayContent,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";
import type { Transaction } from "../lib/types";

type CategoryExpensesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  transactions: Transaction[];
  canWriteFinancial: boolean;
  formatCurrency: (value: number) => string;
  formatDate: (value: string) => string;
  onDeleteTransaction: (transactionId: string) => void;
};

export function CategoryExpensesSheet({
  open,
  onOpenChange,
  categoryName,
  transactions,
  canWriteFinancial,
  formatCurrency,
  formatDate,
  onDeleteTransaction,
}: CategoryExpensesSheetProps) {
  return (
    <ResponsiveOverlay open={open} onOpenChange={onOpenChange}>
      <OverlayContent density="compact">
        <OverlayHeader>
          <OverlayTitle>Despesas · {categoryName}</OverlayTitle>
        </OverlayHeader>
        <OverlayBody className="pt-0">
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Ainda sem despesas nesta categoria.
            </p>
          ) : (
            <div className="max-h-[56vh] divide-y divide-border/60 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 py-2.5">
                  {tx.origin === "recurring" ? (
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{tx.description}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                  <span className="shrink-0 text-sm tabular-nums text-status-danger">
                    -{formatCurrency(tx.amount)}
                  </span>
                  {tx.origin === "manual" && canWriteFinancial ? (
                    <button
                      type="button"
                      className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      onClick={() => onDeleteTransaction(tx.id)}
                      aria-label="Remover lançamento"
                    >
                      <Trash2 className="mx-auto h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </OverlayBody>
        <OverlayFooter sticky>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </OverlayFooter>
      </OverlayContent>
    </ResponsiveOverlay>
  );
}
