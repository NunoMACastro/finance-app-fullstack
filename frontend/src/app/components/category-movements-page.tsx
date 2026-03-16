import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { budgetApi, transactionsApi } from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { useAuth } from "../lib/auth-context";
import {
  formatCurrency as formatCurrencyValue,
  formatDateShort,
  formatMonthLong,
} from "../lib/formatting";
import type { MonthBudget, MonthSummary, Transaction } from "../lib/types";
import { Button } from "./ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { Input } from "./ui/input";
import {
  OverlayBody,
  OverlayContent,
  OverlayDescription,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";

type OriginFilter = "all" | "manual" | "recurring";
type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

function isMonthKey(value?: string): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function getMonthDateBounds(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function sortTransactions(transactions: Transaction[], sortBy: SortOption): Transaction[] {
  const copy = [...transactions];
  if (sortBy === "date_asc") {
    return copy.sort((a, b) => a.date.localeCompare(b.date));
  }
  if (sortBy === "amount_desc") {
    return copy.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  }
  if (sortBy === "amount_asc") {
    return copy.sort((a, b) => a.amount - b.amount || b.date.localeCompare(a.date));
  }
  return copy.sort((a, b) => b.date.localeCompare(a.date));
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-8 items-center gap-1 rounded-xl bg-accent px-2.5 text-xs text-foreground transition-colors hover:bg-accent/80"
    >
      <span className="truncate">{label}</span>
      <X className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

export function CategoryMovementsPage() {
  const navigate = useNavigate();
  const { month: monthParam, categoryId } = useParams();
  const { activeAccountId, canWriteFinancial } = useAccount();
  const { user, isAmountsHidden } = useAuth();

  const month = isMonthKey(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
  const bounds = useMemo(() => getMonthDateBounds(month), [month]);

  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [draftOrigin, setDraftOrigin] = useState<OriginFilter>("all");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftMinAmount, setDraftMinAmount] = useState("");
  const [draftMaxAmount, setDraftMaxAmount] = useState("");
  const [draftSortBy, setDraftSortBy] = useState<SortOption>("date_desc");

  const formatCurrency = useCallback(
    (value: number) => formatCurrencyValue(value, user, isAmountsHidden),
    [isAmountsHidden, user],
  );
  const formatDate = useCallback((value: string) => formatDateShort(value, user), [user]);
  const monthLabel = useMemo(() => formatMonthLong(month, user), [month, user]);

  const loadData = useCallback(async () => {
    if (!categoryId) {
      setLoadError("Categoria inválida.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryData, budgetData] = await Promise.all([
        transactionsApi.getMonthSummary(month),
        budgetApi.get(month),
      ]);
      setSummary(summaryData);
      setBudget(budgetData);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Não foi possível carregar os movimentos da categoria"));
      setSummary(null);
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }, [categoryId, month, activeAccountId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categoryName = useMemo(() => {
    if (!categoryId) return "Categoria";
    return budget?.categories.find((category) => category.id === categoryId)?.name ?? "Categoria";
  }, [budget, categoryId]);

  const allCategoryTransactions = useMemo(() => {
    if (!categoryId) return [] as Transaction[];
    return sortTransactions(
      (summary?.expenseTransactions ?? []).filter((transaction) => transaction.categoryId === categoryId),
      "date_desc",
    );
  }, [categoryId, summary]);

  const filteredTransactions = useMemo(() => {
    const min = minAmount.trim() === "" ? null : Number(minAmount);
    const max = maxAmount.trim() === "" ? null : Number(maxAmount);
    const searchTerm = search.trim().toLowerCase();

    const filtered = allCategoryTransactions.filter((transaction) => {
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm)) return false;
      if (origin !== "all" && transaction.origin !== origin) return false;
      if (dateFrom && transaction.date < dateFrom) return false;
      if (dateTo && transaction.date > dateTo) return false;
      if (min !== null && Number.isFinite(min) && transaction.amount < min) return false;
      if (max !== null && Number.isFinite(max) && transaction.amount > max) return false;
      return true;
    });

    return sortTransactions(filtered, sortBy);
  }, [allCategoryTransactions, dateFrom, dateTo, maxAmount, minAmount, origin, search, sortBy]);

  const totalSpent = useMemo(
    () => allCategoryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    [allCategoryTransactions],
  );

  const clearFilters = () => {
    setSearch("");
    setOrigin("all");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("date_desc");
    setDraftOrigin("all");
    setDraftDateFrom("");
    setDraftDateTo("");
    setDraftMinAmount("");
    setDraftMaxAmount("");
    setDraftSortBy("date_desc");
  };

  const openFilters = () => {
    setDraftOrigin(origin);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftMinAmount(minAmount);
    setDraftMaxAmount(maxAmount);
    setDraftSortBy(sortBy);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setOrigin(draftOrigin);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setMinAmount(draftMinAmount);
    setMaxAmount(draftMaxAmount);
    setSortBy(draftSortBy);
    setFiltersOpen(false);
  };

  const clearDraftFilters = () => {
    setDraftOrigin("all");
    setDraftDateFrom("");
    setDraftDateTo("");
    setDraftMinAmount("");
    setDraftMaxAmount("");
    setDraftSortBy("date_desc");
  };

  const hasAdvancedFilters = Boolean(
    origin !== "all" ||
      dateFrom ||
      dateTo ||
      minAmount.trim() ||
      maxAmount.trim() ||
      sortBy !== "date_desc",
  );

  const hasAnyFilters = Boolean(search.trim()) || hasAdvancedFilters;

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      chips.push({
        key: "search",
        label: `Pesquisa: ${trimmedSearch}`,
        onClear: () => setSearch(""),
      });
    }
    if (origin !== "all") {
      chips.push({
        key: "origin",
        label: `Origem: ${origin === "manual" ? "Manual" : "Recorrente"}`,
        onClear: () => setOrigin("all"),
      });
    }
    if (dateFrom) {
      chips.push({
        key: "dateFrom",
        label: `De: ${formatDate(dateFrom)}`,
        onClear: () => setDateFrom(""),
      });
    }
    if (dateTo) {
      chips.push({
        key: "dateTo",
        label: `Até: ${formatDate(dateTo)}`,
        onClear: () => setDateTo(""),
      });
    }
    if (minAmount.trim()) {
      chips.push({
        key: "minAmount",
        label: `Mín: ${formatCurrency(Number(minAmount) || 0)}`,
        onClear: () => setMinAmount(""),
      });
    }
    if (maxAmount.trim()) {
      chips.push({
        key: "maxAmount",
        label: `Máx: ${formatCurrency(Number(maxAmount) || 0)}`,
        onClear: () => setMaxAmount(""),
      });
    }
    if (sortBy !== "date_desc") {
      const sortLabelMap: Record<SortOption, string> = {
        date_desc: "Data: mais recentes",
        date_asc: "Data: mais antigas",
        amount_desc: "Valor: maior primeiro",
        amount_asc: "Valor: menor primeiro",
      };
      chips.push({
        key: "sortBy",
        label: sortLabelMap[sortBy],
        onClear: () => setSortBy("date_desc"),
      });
    }
    return chips;
  }, [dateFrom, dateTo, formatCurrency, formatDate, maxAmount, minAmount, origin, search, sortBy]);

  const handleDelete = async (transactionId: string) => {
    try {
      await transactionsApi.delete(transactionId);
      toast.success("Lançamento removido");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o lançamento"));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-6" data-ui-v3-page="category-movements">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl"
          onClick={() => navigate(`/?month=${month}`)}
          aria-label="Voltar para o mês"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base text-foreground">Despesas · {categoryName}</h2>
          <p className="text-xs capitalize text-muted-foreground">{monthLabel}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-warning/35 bg-warning-soft/70 p-4">
          <p className="text-sm text-warning-foreground">{loadError}</p>
          <Button className="mt-3 h-10 rounded-xl" variant="outline" onClick={() => void loadData()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1 border-b border-border/60 pb-3">
            <p className="text-xs text-muted-foreground">
              {allCategoryTransactions.length} mov. · {formatCurrency(totalSpent)} gasto
            </p>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} resultados
              {filteredTransactions.length !== allCategoryTransactions.length
                ? ` de ${allCategoryTransactions.length}`
                : ""}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar descrição"
                className="h-11 flex-1 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-3"
                onClick={openFilters}
                aria-label="Abrir filtros avançados"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </div>
            {hasAnyFilters ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterChips.map((chip) => (
                  <FilterChip key={chip.key} label={chip.label} onClear={chip.onClear} />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            ) : null}
          </div>

          {allCategoryTransactions.length === 0 ? (
            <div className="rounded-xl border border-border/60 py-8 text-center text-sm text-muted-foreground">
              Ainda sem despesas nesta categoria.
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-border/60 py-8 text-center text-sm text-muted-foreground">
              Nenhum movimento corresponde aos filtros.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border-y border-border/60">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-2 py-2.5">
                  {transaction.origin === "recurring" ? (
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {transaction.description}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                  <span className="shrink-0 text-sm tabular-nums text-status-danger">
                    -{formatCurrency(transaction.amount)}
                  </span>
                  {transaction.origin === "manual" && canWriteFinancial ? (
                    <button
                      type="button"
                      className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      onClick={() => setPendingDeleteId(transaction.id)}
                      aria-label="Remover lançamento"
                    >
                      <Trash2 className="mx-auto h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {!canWriteFinancial ? (
            <div className="rounded-xl border border-info/35 bg-info-soft/70 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-info-foreground" />
                <p className="text-xs text-info-foreground">
                  Modo leitura: não tens permissão para remover lançamentos.
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}

      <ResponsiveOverlay open={filtersOpen} onOpenChange={setFiltersOpen}>
        <OverlayContent density="compact">
          <OverlayHeader>
            <OverlayTitle>Filtros avançados</OverlayTitle>
            <OverlayDescription>Refina os movimentos desta categoria</OverlayDescription>
          </OverlayHeader>
          <OverlayBody className="pt-0">
            <div className="grid grid-cols-2 gap-2" data-testid="category-filters-sheet">
              <select
                className="h-10 rounded-xl border border-border bg-input-background px-3 text-sm text-foreground"
                value={draftOrigin}
                onChange={(event) => setDraftOrigin(event.target.value as OriginFilter)}
                aria-label="Filtrar por origem"
              >
                <option value="all">Origem: Todas</option>
                <option value="manual">Origem: Manual</option>
                <option value="recurring">Origem: Recorrente</option>
              </select>
              <select
                className="h-10 rounded-xl border border-border bg-input-background px-3 text-sm text-foreground"
                value={draftSortBy}
                onChange={(event) => setDraftSortBy(event.target.value as SortOption)}
                aria-label="Ordenar movimentos"
              >
                <option value="date_desc">Data: mais recentes</option>
                <option value="date_asc">Data: mais antigas</option>
                <option value="amount_desc">Valor: maior primeiro</option>
                <option value="amount_asc">Valor: menor primeiro</option>
              </select>
              <Input
                type="date"
                value={draftDateFrom}
                min={bounds.start}
                max={bounds.end}
                onChange={(event) => setDraftDateFrom(event.target.value)}
                className="h-10 rounded-xl"
                aria-label="Data inicial"
              />
              <Input
                type="date"
                value={draftDateTo}
                min={bounds.start}
                max={bounds.end}
                onChange={(event) => setDraftDateTo(event.target.value)}
                className="h-10 rounded-xl"
                aria-label="Data final"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draftMinAmount}
                onChange={(event) => setDraftMinAmount(event.target.value)}
                placeholder="Valor mín."
                className="h-10 rounded-xl"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draftMaxAmount}
                onChange={(event) => setDraftMaxAmount(event.target.value)}
                placeholder="Valor máx."
                className="h-10 rounded-xl"
              />
            </div>
          </OverlayBody>
          <OverlayFooter sticky>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={clearDraftFilters}
            >
              Limpar
            </Button>
            <Button
              type="button"
              className="rounded-xl border-0 bg-brand-gradient text-primary-foreground"
              onClick={applyFilters}
            >
              Aplicar filtros
            </Button>
          </OverlayFooter>
        </OverlayContent>
      </ResponsiveOverlay>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDeleteId(null);
        }}
        title="Remover lançamento?"
        description="Esta ação não pode ser anulada."
        confirmLabel="Remover"
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          await handleDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
