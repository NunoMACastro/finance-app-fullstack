import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { statsApi } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { formatCurrency as formatCurrencyValue, formatMonthShort } from "../lib/formatting";
import type { StatsSnapshot, UserProfile } from "../lib/types";
import { StatsCategoryInsightSheet } from "./stats-category-insight-sheet";
import { StatsDriversList } from "./stats-drivers-list";
import { StatsForecastPanel } from "./stats-forecast-panel";
import { StatsPulsePanel } from "./stats-pulse-panel";
import { StatsTrendPanel, type StatsTrendPoint } from "./stats-trend-panel";
import {
  buildStatsViewModel,
  type StatsDriver,
} from "./stats-view-model";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";
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

function parsePeriod(value: string | null): "semester" | "year" {
  return value === "year" ? "year" : "semester";
}

function parseForecastWindow(value: string | null): 3 | 6 {
  return value === "6" ? 6 : 3;
}

export function StatsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAmountsHidden } = useAuth();
  const [period, setPeriod] = useState<"semester" | "year">(() => parsePeriod(searchParams.get("period")));
  const [forecastWindow, setForecastWindow] = useState<3 | 6>(() =>
    parseForecastWindow(searchParams.get("forecastWindow")),
  );
  const [snapshot, setSnapshot] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  useEffect(() => {
    setSearchParams(
      {
        period,
        forecastWindow: String(forecastWindow),
      },
      { replace: true },
    );
  }, [forecastWindow, period, setSearchParams]);

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
          ? await statsApi.getSemester(undefined, forecastWindow)
          : await statsApi.getYear(undefined, forecastWindow);
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
        <PageSectionFadeInV3>
          <StatsLoadingSkeleton />
        </PageSectionFadeInV3>
      </div>
    );
  }

  if (loadError && !snapshot) {
    return (
      <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="stats">
        <PageSectionFadeInV3 asChild>
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
        </PageSectionFadeInV3>
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
        <PageSectionFadeInV3 asChild>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            A atualizar estatísticas...
          </p>
        </PageSectionFadeInV3>
      ) : null}

      {loadError ? (
        <PageSectionFadeInV3 asChild>
          <div className="rounded-xl bg-warning-soft px-3 py-2">
            <p className="text-xs text-warning-foreground">{loadError}</p>
          </div>
        </PageSectionFadeInV3>
      ) : null}

      <PageSectionFadeInV3 asChild>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Análise IA</h2>
          </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                navigate(`/stats/insights?period=${period}&forecastWindow=${forecastWindow}&from=/stats`);
              }}
            >
              Abrir análise IA
            </Button>
        </div>
      </PageSectionFadeInV3>

      <PageSectionFadeInV3>
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
        />
      </PageSectionFadeInV3>

      <PageSectionFadeInV3>
        <StatsDriversList
          drivers={model.topDrivers}
          formatCurrency={formatCurrency}
          onSelectDriver={(driver) => {
            setSelectedDriver(driver);
            setInsightOpen(true);
          }}
        />
      </PageSectionFadeInV3>

      <PageSectionFadeInV3>
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
      </PageSectionFadeInV3>

      <PageSectionFadeInV3>
        <StatsForecastPanel
          forecast={model.forecast}
          forecastWindow={forecastWindow}
          onForecastWindowChange={setForecastWindow}
          formatCurrency={formatCurrency}
        />
      </PageSectionFadeInV3>

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
