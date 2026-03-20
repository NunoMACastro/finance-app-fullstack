import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import { statsApi } from "../lib/api";
import { useAccount } from "../lib/account-context";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { formatCurrency as formatCurrencyValue, formatMonthShort } from "../lib/formatting";
import type { UserProfile } from "../lib/types";
import { StatsCategoryInsightSheet } from "./stats-category-insight-sheet";
import { StatsDriversList } from "./stats-drivers-list";
import { StatsForecastPanel } from "./stats-forecast-panel";
import { StatsPulsePanel } from "./stats-pulse-panel";
import { StatsTrendPanel, type StatsTrendPoint } from "./stats-trend-panel";
import {
  buildPulseInsight,
  buildStatsViewModel,
  mapInsightAliasesToCategoryNames,
  type StatsDriver,
} from "./stats-view-model";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

function StatsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="rounded-xl bg-surface-soft/50 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-44" />
        <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
        <Skeleton className="mt-3 h-4 w-full" />
      </div>
      <div className="rounded-xl bg-surface-soft/50 p-4">
        <Skeleton className="h-4 w-36" />
        <div className="mt-3 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
      <div className="rounded-xl bg-surface-soft/50 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-44 w-full" />
      </div>
      <div className="rounded-xl bg-surface-soft/50 p-4">
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 grid grid-cols-1 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatCurrencyFactory(
  user: Pick<UserProfile, "currency"> | null | undefined,
  hidden: boolean,
) {
  return (value: number) => formatCurrencyValue(value, user, hidden);
}

export function StatsPage() {
  const navigate = useNavigate();
  const { user, isAmountsHidden } = useAuth();
  const { activeAccountId } = useAccount();
  const [period, setPeriod] = useState<"semester" | "year">("semester");
  const [forecastWindow, setForecastWindow] = useState<3 | 6>(3);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof statsApi.getSemester>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasSnapshotRef = useRef(false);
  const [selectedDriver, setSelectedDriver] = useState<StatsDriver | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    income: true,
    expense: true,
    balance: true,
  });

  const formatCurrency = useMemo(
    () => formatCurrencyFactory(user, isAmountsHidden),
    [user, isAmountsHidden],
  );

  const loadStats = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const hasSnapshot = hasSnapshotRef.current;
    if (hasSnapshot) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    setInsightOpen(false);
    setSelectedDriver(null);
    setSelectedTrendIndex(null);
    try {
      const data =
        period === "semester"
          ? await statsApi.getSemester(undefined, forecastWindow, { includeInsight: false })
          : await statsApi.getYear(undefined, forecastWindow, { includeInsight: false });
      if (requestId !== requestIdRef.current) return;
      setSnapshot(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (!hasSnapshot) {
        setSnapshot(null);
      }
      setLoadError(getErrorMessage(error, "Não foi possível carregar estatísticas"));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period, forecastWindow, activeAccountId]);

  const loadInsight = useCallback(async () => {
    const requestId = requestIdRef.current;
    setInsightLoading(true);
    try {
      const enrichedData =
        period === "semester"
          ? await statsApi.getSemester(undefined, forecastWindow, { includeInsight: true })
          : await statsApi.getYear(undefined, forecastWindow, { includeInsight: true });
      if (requestId !== requestIdRef.current || !enrichedData.insight) return;
      setSnapshot((current) => (current ? { ...current, insight: enrichedData.insight } : current));
    } catch {
      // Falha do enrichment não bloqueia o snapshot principal.
    } finally {
      if (requestId === requestIdRef.current) {
        setInsightLoading(false);
      }
    }
  }, [forecastWindow, period]);

  useEffect(() => {
    hasSnapshotRef.current = snapshot !== null;
  }, [snapshot]);

  useEffect(() => {
    void loadStats();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadStats]);

  const model = useMemo(
    () => (snapshot ? buildStatsViewModel(snapshot) : null),
    [snapshot],
  );

  const trendPoints: StatsTrendPoint[] = useMemo(() => {
    if (!model) return [];
    return model.trend.map((point) => ({
      ...point,
      name: formatMonthShort(point.month, user),
    }));
  }, [model, user]);

  const periodLabel = period === "semester" ? "Últimos 6 meses" : "Últimos 12 meses";
  const budgetAdherenceLabel = "Aderência ao orçamento";
  const budgetAdherenceDisplay =
    model && model.budgetedTotal > 0
      ? formatPercent(model.budgetAdherenceRate)
      : "n/d";
  const unallocatedLabel =
    model && model.unallocated < 0 ? "Valor em falta" : "Valor por alocar";
  const unallocatedDisplay =
    model && model.unallocated < 0
      ? formatCurrency(Math.abs(model.unallocated))
      : model
        ? formatCurrency(model.unallocated)
        : formatCurrency(0);
  const unallocatedRateLabel =
    model && model.unallocatedRate < 0 ? "Taxa em falta" : "Taxa por alocar";
  const unallocatedRateDisplay =
    model && model.unallocatedRate < 0
      ? formatPercent(Math.abs(model.unallocatedRate))
      : model
        ? formatPercent(model.unallocatedRate)
        : formatPercent(0);
  const aiInsightText = snapshot?.insight?.text
    ? mapInsightAliasesToCategoryNames(snapshot, snapshot.insight.text)
    : null;
  const insightMessage = model
    ? aiInsightText ?? buildPulseInsight(model, formatCurrency)
    : "";
  const periodOptions = [
    { value: "semester" as const, label: "6M" },
    { value: "year" as const, label: "12M" },
  ];

  if (loading) {
    return (
      <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="stats">
        <PageHeaderV3
          title="Estatísticas"
          subtitle={periodLabel}
          caption="A mostrar dados da conta ativa"
          trailing={(
            <SegmentedControlV3
              value={period}
              onChange={() => {
                // No-op no estado de loading.
              }}
              options={periodOptions.map((option) => ({ ...option, disabled: true }))}
              size="default"
              ariaLabel="Selecionar período"
            />
          )}
        />
        <StatsLoadingSkeleton />
      </div>
    );
  }

  if (loadError && !snapshot) {
    return (
      <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="stats">
        <div className="rounded-2xl border border-warning/40 bg-warning-soft p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
            <div className="space-y-3">
              <p className="text-sm text-warning-foreground">{loadError}</p>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-warning/60 text-status-warning hover:bg-warning/20"
                onClick={() => {
                  void loadStats();
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot || !model) return null;

  return (
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="stats">
      <PageHeaderV3
        title="Estatísticas"
        subtitle={periodLabel}
        caption="A mostrar dados da conta ativa"
        trailing={(
          <SegmentedControlV3
            value={period}
            onChange={(value) => setPeriod(value as "semester" | "year")}
            options={periodOptions}
            size="default"
            ariaLabel="Selecionar período"
            dataTour="stats-period-tabs"
          />
        )}
      />

      {refreshing ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          A atualizar estatísticas...
        </p>
      ) : null}

      {loadError ? (
        <div className="rounded-xl bg-warning-soft px-3 py-2">
          <p className="text-xs text-warning-foreground">{loadError}</p>
        </div>
      ) : null}

      {!snapshot.insight ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => void loadInsight()}
            disabled={insightLoading}
          >
            {insightLoading ? "A gerar insight..." : "Gerar insight IA"}
          </Button>
        </div>
      ) : null}

      <StatsPulsePanel
        periodLabel={periodLabel}
        totalBalance={formatCurrency(model.totalBalance)}
        totalIncome={formatCurrency(model.totalIncome)}
        totalConsumption={formatCurrency(model.consumption)}
        totalSavings={formatCurrency(model.savings)}
        unallocatedLabel={unallocatedLabel}
        unallocatedValue={unallocatedDisplay}
        budgetAdherenceLabel={budgetAdherenceLabel}
        budgetAdherence={budgetAdherenceDisplay}
        savingsRate={formatPercent(model.savingsRate)}
        unallocatedRateLabel={unallocatedRateLabel}
        unallocatedRate={unallocatedRateDisplay}
        potentialSavings={formatCurrency(model.potentialSavings)}
        budgetUsePercent={model.budgetUsePercent}
        pulseTone={model.pulseTone}
        insight={insightMessage}
        insightLoading={insightLoading && !aiInsightText}
      />

      <StatsDriversList
        drivers={model.topDrivers}
        formatCurrency={formatCurrency}
        onSelectDriver={(driver) => {
          setSelectedDriver(driver);
          setInsightOpen(true);
        }}
      />

      <StatsTrendPanel
        trend={trendPoints}
        selectedIndex={selectedTrendIndex}
        onSelectPoint={(index) =>
          setSelectedTrendIndex((previous) => (previous === index ? null : index))
        }
        visibleSeries={visibleSeries}
        onToggleSeries={(series) =>
          setVisibleSeries((previous) => ({
            ...previous,
            [series]: !previous[series],
          }))
        }
        formatCurrency={formatCurrency}
      />

      <StatsForecastPanel
        forecast={model.forecast}
        forecastWindow={forecastWindow}
        onForecastWindowChange={setForecastWindow}
        formatCurrency={formatCurrency}
      />

      <StatsCategoryInsightSheet
        open={insightOpen}
        onOpenChange={setInsightOpen}
        driver={selectedDriver}
        formatCurrency={formatCurrency}
        onOpenMovements={() => {
          if (!selectedDriver || !model.latestMonth) return;
          setInsightOpen(false);
          navigate(
            `/month/${model.latestMonth}/category/${selectedDriver.categoryId}/movements`,
          );
        }}
      />
    </div>
  );
}
