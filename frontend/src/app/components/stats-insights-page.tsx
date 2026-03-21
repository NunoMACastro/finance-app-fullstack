import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { statsApi } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { StatsInsightStatusResponse } from "../lib/types";
import { StatsInsightPanel } from "./stats-insight-panel";
import { Button } from "./ui/button";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

function parsePeriod(value: string | null): "semester" | "year" {
  return value === "year" ? "year" : "semester";
}

function parseForecastWindow(value: string | null): 3 | 6 {
  return value === "6" ? 6 : 3;
}

export function StatsInsightsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [forecastWindow, setForecastWindow] = useState<3 | 6>(() =>
    parseForecastWindow(searchParams.get("forecastWindow")),
  );
  const [insightState, setInsightState] = useState<StatsInsightStatusResponse | null>(null);
  const [requesting, setRequesting] = useState(false);
  const requestIdRef = useRef(0);

  const period = parsePeriod(searchParams.get("period"));
  const periodLabel = period === "semester" ? "Últimos 6 meses" : "Últimos 12 meses";
  const backTarget = searchParams.get("from") || "/stats";
  const forecastOptions = [
    { value: 3 as const, label: "3M" },
    { value: 6 as const, label: "6M" },
  ];
  const actionLabel = useMemo(() => {
    if (requesting || insightState?.status === "pending") return "A gerar insight...";
    if (insightState?.report) return "Gerar novamente";
    if (insightState?.status === "failed") return "Tentar novamente";
    return "Gerar insight IA";
  }, [insightState, requesting]);

  useEffect(() => {
    setInsightState(null);
    requestIdRef.current += 1;
  }, [forecastWindow, period]);

  function updateForecastWindow(nextForecastWindow: 3 | 6) {
    setForecastWindow(nextForecastWindow);
    setSearchParams(
      {
        period,
        forecastWindow: String(nextForecastWindow),
        ...(backTarget ? { from: backTarget } : {}),
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (!insightState || insightState.status !== "pending") {
      return undefined;
    }

    const requestId = requestIdRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const next = await statsApi.getInsight(insightState.id);
        if (requestId !== requestIdRef.current) return;
        setInsightState(next);
      } catch {
        if (requestId !== requestIdRef.current) return;
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [insightState]);

  async function handleGenerate() {
    const requestId = ++requestIdRef.current;
    setRequesting(true);
    try {
      const next = await statsApi.requestInsight({
        periodType: period,
        forecastWindow,
      });
      if (requestId !== requestIdRef.current) return;
      setInsightState(next);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setInsightState({
        id: `local-failed-${requestId}`,
        periodType: period,
        periodKey: period === "semester" ? "unknown-semester" : "unknown-year",
        forecastWindow,
        status: "failed",
        stale: false,
        requestedAt: new Date().toISOString(),
        generatedAt: null,
        model: null,
        report: null,
        error: {
          code: "STATS_INSIGHT_REQUEST_FAILED",
          message: "Não foi possível iniciar a geração do insight IA.",
        },
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setRequesting(false);
      }
    }
  }

  return (
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="stats-insights">
      <PageHeaderV3
        title="Análise IA"
        subtitle={periodLabel}
        leading={(
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl hover:bg-accent"
            onClick={() => navigate(backTarget)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      />

      <section className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-4">
        <div className="min-w-0">
          <SegmentedControlV3
            value={forecastWindow}
            onChange={(value) => updateForecastWindow(Number(value) as 3 | 6)}
            options={forecastOptions}
            size="compact"
            ariaLabel="Selecionar janela da análise"
          />
        </div>
        <div className="flex items-center justify-end">
          <Button
            type="button"
            className="h-11 rounded-xl px-4"
            onClick={() => void handleGenerate()}
            disabled={requesting || insightState?.status === "pending"}
          >
            {actionLabel}
          </Button>
        </div>
      </section>

      <StatsInsightPanel
        insight={insightState}
        isRequesting={requesting}
        user={user}
      />
    </div>
  );
}
