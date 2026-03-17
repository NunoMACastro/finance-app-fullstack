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
  type StatsDriver,
} from "./stats-view-model";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

function StatsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="rounded-2xl border border-border/70 bg-surface-soft/50 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-10 w-44" />
        <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
        <Skeleton className="mt-3 h-4 w-full" />
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
        <Skeleton className="h-4 w-36" />
        <div className="mt-3 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-44 w-full" />
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
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
    setLoading(true);
    setLoadError(null);
    setInsightOpen(false);
    setSelectedDriver(null);
    setSelectedTrendIndex(null);
    try {
      const data =
        period === "semester"
          ? await statsApi.getSemester(undefined, forecastWindow)
          : await statsApi.getYear(undefined, forecastWindow);
      if (requestId !== requestIdRef.current) return;
      setSnapshot(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setSnapshot(null);
      setLoadError(getErrorMessage(error, "Não foi possível carregar estatísticas"));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [period, forecastWindow, activeAccountId]);

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
  const insightMessage = model ? buildPulseInsight(model, formatCurrency) : "";

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-6" data-ui-v3-page="stats">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground">Estatísticas</h2>
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
            <p className="text-xs text-muted-foreground">A mostrar dados da conta ativa</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            <button type="button" className="h-8 rounded-lg bg-card px-2 text-xs text-foreground">
              6M
            </button>
            <button type="button" className="h-8 rounded-lg px-2 text-xs text-muted-foreground">
              12M
            </button>
          </div>
        </div>
        <StatsLoadingSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 pb-6" data-ui-v3-page="stats">
        <div className="rounded-2xl border border-warning/40 bg-warning-soft p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
            <div className="space-y-3">
              <p className="text-sm text-warning-foreground">{loadError}</p>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-warning/60 text-status-warning hover:bg-warning/20"
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
    <div className="flex flex-col gap-6 pb-6" data-ui-v3-page="stats">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">Estatísticas</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
          <p className="text-xs text-muted-foreground">A mostrar dados da conta ativa</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1" data-tour="stats-period-tabs">
          <button
            type="button"
            className={`h-8 rounded-lg px-2 text-xs ${
              period === "semester" ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setPeriod("semester")}
          >
            6M
          </button>
          <button
            type="button"
            className={`h-8 rounded-lg px-2 text-xs ${
              period === "year" ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setPeriod("year")}
          >
            12M
          </button>
        </div>
      </div>

      <StatsPulsePanel
        periodLabel={periodLabel}
        totalBalance={formatCurrency(model.totalBalance)}
        totalIncome={formatCurrency(model.totalIncome)}
        totalExpense={formatCurrency(model.totalExpense)}
        budgetDelta={formatCurrency(model.budgetDelta)}
        savingsRate={formatPercent(model.savingsRate)}
        budgetUsePercent={model.budgetUsePercent}
        pulseTone={model.pulseTone}
        insight={insightMessage}
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
