import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { statsApi } from "../lib/api";
import { useAccount } from "../lib/account-context";
import type { StatsInsightStatusResponse } from "../lib/types";
import { StatsInsightPanel } from "./stats-insight-panel";
import { Button } from "./ui/button";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

const POLL_RETRY_DELAYS_MS = [1500, 3000, 5000] as const;
const MAX_CONSECUTIVE_POLL_FAILURES = POLL_RETRY_DELAYS_MS.length;

function parsePeriod(value: string | null): "semester" | "year" {
  return value === "year" ? "year" : "semester";
}

function parseForecastWindow(value: string | null): 3 | 6 {
  return value === "6" ? 6 : 3;
}

export function StatsInsightsPage() {
  const navigate = useNavigate();
  const { activeAccountId } = useAccount();
  const [searchParams] = useSearchParams();
  const [insightState, setInsightState] = useState<StatsInsightStatusResponse | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [consecutivePollFailures, setConsecutivePollFailures] = useState(0);
  const [pollingSuspended, setPollingSuspended] = useState(false);
  const [pollErrorMessage, setPollErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const period = parsePeriod(searchParams.get("period"));
  const forecastWindow = parseForecastWindow(searchParams.get("forecastWindow"));
  const periodLabel = period === "semester" ? "Últimos 6 meses" : "Últimos 12 meses";
  const backTarget = searchParams.get("from") || "/stats";
  const actionLabel = useMemo(() => {
    if (requesting || insightState?.status === "pending") return "A gerar análise...";
    if (insightState?.report) return "Gerar novamente";
    if (insightState?.status === "failed") return "Tentar novamente";
    return "Gerar análise IA";
  }, [insightState, requesting]);

  const resetPollingState = useCallback(() => {
    setConsecutivePollFailures(0);
    setPollingSuspended(false);
    setPollErrorMessage(null);
  }, []);

  useEffect(() => {
    setInsightState(null);
    setRequesting(false);
    resetPollingState();
    requestIdRef.current += 1;
  }, [activeAccountId, forecastWindow, period, resetPollingState]);

  useEffect(() => {
    if (!insightState || insightState.status !== "pending" || pollingSuspended) {
      return undefined;
    }

    const requestId = requestIdRef.current;
    const delay = POLL_RETRY_DELAYS_MS[Math.min(consecutivePollFailures, POLL_RETRY_DELAYS_MS.length - 1)];
    const timer = window.setTimeout(async () => {
      try {
        const next = await statsApi.getInsight(insightState.id);
        if (requestId !== requestIdRef.current) return;
        resetPollingState();
        setInsightState(next);
      } catch {
        if (requestId !== requestIdRef.current) return;
        const nextFailures = consecutivePollFailures + 1;
        if (nextFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setConsecutivePollFailures(nextFailures);
          setPollingSuspended(true);
          setPollErrorMessage("Não foi possível verificar o estado do pedido. Retoma a verificação para continuar.");
          return;
        }
        setConsecutivePollFailures(nextFailures);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [consecutivePollFailures, insightState, pollingSuspended, resetPollingState]);

  const handleResumePolling = useCallback(() => {
    requestIdRef.current += 1;
    resetPollingState();
  }, [resetPollingState]);

  async function handleGenerate() {
    const requestId = ++requestIdRef.current;
    resetPollingState();
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
          message: "Não foi possível iniciar a geração da análise IA.",
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
        trailing={(
          <Button
            type="button"
            className="h-11 rounded-xl px-4"
            onClick={() => void handleGenerate()}
            disabled={requesting || insightState?.status === "pending"}
          >
            {actionLabel}
          </Button>
        )}
      />

      <PageSectionFadeInV3 asChild>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Análise gerada com tratamento anonimizado dos dados.</p>
          <p>As recomendações são indicativas e devem ser validadas no contexto real.</p>
        </div>
      </PageSectionFadeInV3>

      <PageSectionFadeInV3>
        <StatsInsightPanel
          insight={insightState}
          isRequesting={requesting}
          consecutivePollFailures={consecutivePollFailures}
          pollingSuspended={pollingSuspended}
          pollErrorMessage={pollErrorMessage}
          onResumePolling={handleResumePolling}
        />
      </PageSectionFadeInV3>
    </div>
  );
}
