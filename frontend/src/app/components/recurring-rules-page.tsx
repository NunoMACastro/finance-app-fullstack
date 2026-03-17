import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pause, Pencil, Play, Repeat, Trash2, TriangleAlert } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { budgetApi, incomeCategoriesApi, recurringApi } from "../lib/api";
import { useAccount } from "../lib/account-context";
import { getErrorMessage } from "../lib/api-error";
import type { BudgetCategory, IncomeCategory, RecurringRule } from "../lib/types";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ProfileSectionShell } from "./profile-section-shell";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toLabelMonth(month: string): string {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

type RuleFormState = {
  type: "income" | "expense";
  name: string;
  amount: string;
  dayOfMonth: string;
  categoryId: string;
  startMonth: string;
  endMonth: string;
};

const EMPTY_FORM: RuleFormState = {
  type: "expense",
  name: "",
  amount: "",
  dayOfMonth: "1",
  categoryId: "",
  startMonth: getCurrentMonthKey(),
  endMonth: "",
};

function ruleToForm(rule: RecurringRule): RuleFormState {
  return {
    type: rule.type,
    name: rule.name,
    amount: String(rule.amount),
    dayOfMonth: String(rule.dayOfMonth),
    categoryId: rule.categoryId,
    startMonth: rule.startMonth,
    endMonth: rule.endMonth ?? "",
  };
}

function formatRuleSchedule(rule: RecurringRule): string {
  const endText = rule.endMonth ? ` até ${toLabelMonth(rule.endMonth)}` : " sem fim";
  return `Dia ${rule.dayOfMonth} · desde ${toLabelMonth(rule.startMonth)}${endText}`;
}

function getRuleStatusText(rule: RecurringRule): string {
  const pendingFallbackCount = rule.pendingFallbackCount ?? 0;
  if (pendingFallbackCount > 0) {
    return `${pendingFallbackCount} fallback(s) pendente(s)`;
  }
  if (rule.lastGenerationStatus === "fallback") {
    return "Última geração com fallback";
  }
  if (rule.lastGenerationStatus === "ok") {
    return "Última geração OK";
  }
  return "Sem geração ainda";
}

function getRuleStatusTone(rule: RecurringRule): "warning" | "normal" {
  if ((rule.pendingFallbackCount ?? 0) > 0 || rule.lastGenerationStatus === "fallback") {
    return "warning";
  }
  return "normal";
}

export function RecurringRulesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canWriteFinancial } = useAccount();
  const backTo = typeof location.state === "object" && location.state && "from" in location.state
    ? String((location.state as { from?: string }).from ?? "/profile")
    : "/profile";

  const currentMonth = useMemo(() => getCurrentMonthKey(), []);

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [savingRule, setSavingRule] = useState(false);

  const [pendingDeleteRule, setPendingDeleteRule] = useState<RecurringRule | null>(null);
  const [runningGenerate, setRunningGenerate] = useState(false);

  const [reassignRuleId, setReassignRuleId] = useState<string | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState("");
  const [migrateHistory, setMigrateHistory] = useState(false);
  const [savingReassign, setSavingReassign] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      const [rulesData, monthBudget, incomeData] = await Promise.all([
        recurringApi.list(),
        budgetApi.get(currentMonth),
        incomeCategoriesApi.list(),
      ]);
      setRules(rulesData);
      setBudgetCategories(monthBudget.categories);
      setIncomeCategories(incomeData.filter((category) => category.active));
    } catch (error) {
      setLoadingError(getErrorMessage(error, "Não foi possível carregar as recorrências"));
      setRules([]);
      setBudgetCategories([]);
      setIncomeCategories([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedCategoryOptions = form.type === "income" ? incomeCategories : budgetCategories;

  useEffect(() => {
    if (selectedCategoryOptions.length === 0) {
      if (form.categoryId !== "") {
        setForm((prev) => ({ ...prev, categoryId: "" }));
      }
      return;
    }

    const exists = selectedCategoryOptions.some((category) => category.id === form.categoryId);
    if (!exists) {
      setForm((prev) => ({ ...prev, categoryId: selectedCategoryOptions[0]?.id ?? "" }));
    }
  }, [form.categoryId, selectedCategoryOptions]);

  const startCreate = () => {
    setEditingRuleId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: budgetCategories[0]?.id ?? incomeCategories[0]?.id ?? "",
      startMonth: currentMonth,
    });
    setIsFormOpen(true);
  };

  const startEdit = (rule: RecurringRule) => {
    setEditingRuleId(rule.id);
    setForm(ruleToForm(rule));
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingRuleId(null);
    setForm(EMPTY_FORM);
  };

  const submitForm = async () => {
    if (!canWriteFinancial || !form.name.trim() || !form.amount || !form.categoryId) {
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        amount: Number.parseFloat(form.amount),
        dayOfMonth: Math.min(Math.max(Number.parseInt(form.dayOfMonth || "1", 10), 1), 31),
        categoryId: form.categoryId,
        startMonth: form.startMonth,
        endMonth: form.endMonth || undefined,
      };

      if (editingRuleId) {
        await recurringApi.update(editingRuleId, {
          name: payload.name,
          amount: payload.amount,
          dayOfMonth: payload.dayOfMonth,
          categoryId: payload.categoryId,
          endMonth: payload.endMonth,
        });
        toast.success("Regra recorrente atualizada");
      } else {
        await recurringApi.create(payload);
        toast.success("Regra recorrente criada");
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível guardar a regra"));
    } finally {
      setSavingRule(false);
    }
  };

  const toggleRuleActive = async (rule: RecurringRule) => {
    if (!canWriteFinancial) return;
    try {
      await recurringApi.update(rule.id, { active: !rule.active });
      toast.success(rule.active ? "Regra pausada" : "Regra reativada");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível atualizar estado da regra"));
    }
  };

  const runGenerate = async () => {
    if (!canWriteFinancial) return;
    setRunningGenerate(true);
    try {
      const result = await recurringApi.generate(currentMonth);
      toast.success(`Geração concluída: ${result.created} lançamento(s), ${result.fallbackCreated} fallback(s).`);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível gerar recorrências"));
    } finally {
      setRunningGenerate(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteRule) return;
    try {
      await recurringApi.delete(pendingDeleteRule.id);
      toast.success("Regra removida");
      setPendingDeleteRule(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover a regra"));
    }
  };

  const currentReassignRule = rules.find((rule) => rule.id === reassignRuleId) ?? null;
  const reassignOptions = currentReassignRule?.type === "income" ? incomeCategories : budgetCategories;

  useEffect(() => {
    if (!currentReassignRule) return;
    const exists = reassignOptions.some((category) => category.id === reassignCategoryId);
    if (!exists) {
      setReassignCategoryId(reassignOptions[0]?.id ?? "");
    }
  }, [currentReassignRule, reassignCategoryId, reassignOptions]);

  const submitReassign = async () => {
    if (!currentReassignRule || !canWriteFinancial || !reassignCategoryId) return;
    setSavingReassign(true);
    try {
      const result = await recurringApi.reassignCategory(currentReassignRule.id, {
        categoryId: reassignCategoryId,
        migratePastFallbackTransactions: migrateHistory,
      });
      toast.success(`Categoria reatribuída. ${result.migratedTransactions} lançamento(s) migrado(s).`);
      setReassignRuleId(null);
      setMigrateHistory(false);
      setReassignCategoryId("");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível reatribuir categoria"));
    } finally {
      setSavingReassign(false);
    }
  };

  return (
    <ProfileSectionShell
      title="Recorrências"
      description="Automatiza receitas e despesas por vencimento mensal."
      pageId="recurring-rules"
      backTo={backTo}
    >
      <section className={UI_V3_CLASS.sectionStack}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Gestão dedicada de regras recorrentes para a conta ativa.
          </p>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => navigate("/", { replace: false, state: { from: "/recurring" } })}
          >
            Ir para mês
          </Button>
        </div>

        {canWriteFinancial ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="h-11 rounded-xl" onClick={startCreate}>
              Nova regra
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => void runGenerate()}>
              {runningGenerate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
              Gerar agora ({currentMonth})
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-surface-soft px-3 py-2.5 text-xs text-muted-foreground">
            Modo leitura: podes consultar regras, mas não podes editar.
          </div>
        )}

        {isFormOpen ? (
          <div className="rounded-2xl border border-border/70 bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-foreground">{editingRuleId ? "Editar regra" : "Nova regra"}</p>
              <Button variant="ghost" className="h-9 rounded-xl px-3" onClick={resetForm}>
                Cancelar
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              <SegmentedControlV3
                value={form.type}
                onChange={(value) => setForm((prev) => ({ ...prev, type: value as "income" | "expense" }))}
                options={[
                  { value: "expense", label: "Despesa" },
                  { value: "income", label: "Receita" },
                ]}
                size="default"
                ariaLabel="Tipo da regra recorrente"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Descrição</label>
                  <Input
                    className="h-11 rounded-xl"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ex: Salário"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Valor</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-11 rounded-xl"
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Dia do mês</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    className="h-11 rounded-xl"
                    value={form.dayOfMonth}
                    onChange={(event) => setForm((prev) => ({ ...prev, dayOfMonth: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Início</label>
                  <Input
                    type="month"
                    className="h-11 rounded-xl"
                    value={form.startMonth}
                    onChange={(event) => setForm((prev) => ({ ...prev, startMonth: event.target.value }))}
                    disabled={Boolean(editingRuleId)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Fim (opcional)</label>
                  <Input
                    type="month"
                    className="h-11 rounded-xl"
                    value={form.endMonth}
                    onChange={(event) => setForm((prev) => ({ ...prev, endMonth: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">
                    {form.type === "income" ? "Categoria de receita" : "Categoria de despesa"}
                  </label>
                  <select
                    className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground"
                    value={form.categoryId}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  >
                    {selectedCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {form.type === "expense" && selectedCategoryOptions.length === 0 ? (
                    <p className="text-xs text-warning-foreground">
                      Sem categorias de despesa no mês atual. Define primeiro um orçamento para associar a regra.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="h-11 flex-1 rounded-xl"
                  onClick={() => void submitForm()}
                  disabled={
                    savingRule
                    || !canWriteFinancial
                    || !form.name.trim()
                    || !form.amount
                    || !form.categoryId
                    || (form.type === "expense" && selectedCategoryOptions.length === 0)
                  }
                >
                  {savingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRuleId ? "Guardar" : "Criar regra"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            A carregar regras...
          </div>
        ) : loadingError ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger-foreground">
            {loadingError}
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface-soft/60 px-3 py-5 text-center text-sm text-muted-foreground">
            Ainda sem regras recorrentes.
          </div>
        ) : (
          <div className="divide-y divide-border/60 border-y border-border/60">
            {rules.map((rule) => {
              const tone = getRuleStatusTone(rule);
              const statusText = getRuleStatusText(rule);
              const isReassignOpen = reassignRuleId === rule.id;

              return (
                <div key={rule.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.type === "income" ? "Receita" : "Despesa"} · {rule.amount.toFixed(2)}€
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRuleSchedule(rule)}</p>
                      <p className={`mt-1 inline-flex items-center gap-1 text-xs ${
                        tone === "warning" ? "text-warning-foreground" : "text-muted-foreground"
                      }`}>
                        {tone === "warning" ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
                        {statusText}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => startEdit(rule)}
                        disabled={!canWriteFinancial}
                        aria-label="Editar regra"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => void toggleRuleActive(rule)}
                        disabled={!canWriteFinancial}
                        aria-label={rule.active ? "Pausar regra" : "Ativar regra"}
                      >
                        {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-danger"
                        onClick={() => setPendingDeleteRule(rule)}
                        disabled={!canWriteFinancial}
                        aria-label="Remover regra"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(rule.pendingFallbackCount ?? 0) > 0 && canWriteFinancial ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl px-3"
                        onClick={() => {
                          setReassignRuleId(rule.id);
                          setMigrateHistory(false);
                          setReassignCategoryId("");
                        }}
                      >
                        Reatribuir categoria
                      </Button>
                    </div>
                  ) : null}

                  {isReassignOpen ? (
                    <div className="mt-2 rounded-xl border border-border/70 bg-surface-soft/70 p-2.5">
                      <p className="text-xs text-muted-foreground">Escolhe categoria nova para as próximas gerações.</p>
                      <div className="mt-2 space-y-2">
                        <select
                          className="h-11 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground"
                          value={reassignCategoryId}
                          onChange={(event) => setReassignCategoryId(event.target.value)}
                        >
                          {reassignOptions.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>

                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={migrateHistory}
                            onChange={(event) => setMigrateHistory(event.target.checked)}
                          />
                          Migrar também histórico em fallback desta regra
                        </label>

                        <div className="flex gap-2">
                          <Button
                            className="h-10 rounded-xl"
                            onClick={() => void submitReassign()}
                            disabled={savingReassign || !reassignCategoryId}
                          >
                            {savingReassign ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-10 rounded-xl"
                            onClick={() => setReassignRuleId(null)}
                          >
                            Fechar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteRule)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingDeleteRule(null);
          }
        }}
        title="Remover regra recorrente?"
        description="As transações já criadas não são removidas automaticamente."
        confirmLabel="Remover"
        onConfirm={confirmDelete}
      />
    </ProfileSectionShell>
  );
}
