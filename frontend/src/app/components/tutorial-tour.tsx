import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "./ui/button";

export type TourScope = "month" | "stats";

interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
}

const HEADER_TOUR_STEPS: TourStep[] = [
  {
    id: "header-account-select",
    selector: '[data-tour="header-account-select"]',
    title: "Conta ativa",
    description: "Este seletor muda entre a conta pessoal e os orçamentos partilhados.",
  },
  {
    id: "header-icons",
    selector: '[data-tour="header-icon-actions"]',
    title: "Ações do topo",
    description: "No topo tens os atalhos principais: privacidade, tutorial e sair.",
  },
  {
    id: "header-visibility-toggle",
    selector: '[data-tour="header-visibility-toggle"]',
    title: "Privacidade visual",
    description: "Alterna mostrar/ocultar montantes sem alterar a tua preferência guardada.",
  },
  {
    id: "header-help",
    selector: '[data-tour="header-help"]',
    title: "Ajuda",
    description: "Abre o tutorial guiado com os pontos essenciais deste ecrã.",
  },
  {
    id: "header-logout",
    selector: '[data-tour="header-logout"]',
    title: "Terminar sessão",
    description: "Fecha a sessão atual em segurança.",
  },
  {
    id: "bottom-profile-nav",
    selector: '[data-tour="bottom-profile-nav"]',
    title: "Perfil e partilha",
    description: "Acede ao perfil e abre a área de conta partilhada dentro de Perfil.",
  },
];

const TOUR_STEPS_BY_SCOPE: Record<TourScope, TourStep[]> = {
  month: [
    ...HEADER_TOUR_STEPS,
    {
      id: "month-nav",
      selector: '[data-tour="month-budget-select"]',
      title: "Mês em foco",
      description: "Usa as setas para navegar e toca no mês ao centro para abrir a lista de meses.",
    },
    {
      id: "month-add",
      selector: '[data-tour="month-add-transaction"]',
      title: "Novo lançamento",
      description: "Regista uma receita ou despesa manual no mês ativo.",
    },
    {
      id: "month-budget",
      selector: '[data-tour="month-budget-button"]',
      title: "Orçamento do mês",
      description: "Cria ou edita o orçamento deste mês e ajusta a distribuição por categorias.",
    },
    {
      id: "month-tabs",
      selector: '[data-tour="month-view-tabs"]',
      title: "Movimentos do mês",
      description: "Aqui vês primeiro as categorias de despesa e, abaixo, a lista compacta de receitas.",
    },
    {
      id: "month-categories",
      selector: '[data-tour="month-categories"]',
      title: "Categorias de despesa",
      description: "Cada linha mostra gasto, limite e restante. Toca numa categoria para ver as saídas.",
    },
  ],
  stats: [
    ...HEADER_TOUR_STEPS,
    {
      id: "stats-period",
      selector: '[data-tour="stats-period-tabs"]',
      title: "Período de análise",
      description: "Escolhe entre 6 ou 12 meses para comparar evolução de receitas, despesas e saldo.",
    },
    {
      id: "stats-trend",
      selector: '[data-tour="stats-trend-chart"]',
      title: "Tendência mensal",
      description: "Este gráfico mostra o comportamento mensal e permite abrir detalhes por ponto.",
    },
    {
      id: "stats-budget-vs-actual",
      selector: '[data-tour="stats-budget-actual"]',
      title: "Orçamento vs real",
      description: "Compara o valor orçamentado com o gasto real por categoria e deteta desvios.",
    },
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function TutorialTour({
  open,
  scope,
  showAccountSelectStep = true,
  onClose,
}: {
  open: boolean;
  scope: TourScope;
  showAccountSelectStep?: boolean;
  onClose: (reason: "done" | "skip") => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = useMemo(
    () => {
      const baseSteps = TOUR_STEPS_BY_SCOPE[scope].filter(
        (candidate) => showAccountSelectStep || candidate.id !== "header-account-select",
      );
      if (!open) return baseSteps;

      const availableSteps = baseSteps.filter((candidate) => {
        const target = document.querySelector(candidate.selector);
        return target instanceof HTMLElement;
      });

      // Fallback para evitar lista vazia em edge-cases de timing de render.
      return availableSteps.length > 0 ? availableSteps : baseSteps;
    },
    [scope, showAccountSelectStep, open],
  );
  const currentStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const step = steps[currentStepIndex];

  useEffect(() => {
    if (!open || !step) return;
    setStepIndex(0);
    setTargetRect(null);
  }, [open, scope]);

  useEffect(() => {
    if (!open) return;
    setTargetRect(null);
  }, [open, step?.id]);

  useEffect(() => {
    if (!open) return;

    let rafId = 0;
    let scrollTimerId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let observedElement: HTMLElement | null = null;

    const findTarget = () => {
      const target = document.querySelector(step.selector);
      return target instanceof HTMLElement ? target : null;
    };

    const ensureObservedTarget = (nextTarget: HTMLElement | null) => {
      if (!resizeObserver) return;
      if (observedElement === nextTarget) return;
      if (observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      if (nextTarget) {
        resizeObserver.observe(nextTarget);
      }
      observedElement = nextTarget;
    };

    const refreshRect = () => {
      const targetElement = findTarget();
      ensureObservedTarget(targetElement);
      if (!targetElement) {
        setTargetRect(null);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setTargetRect(null);
        return;
      }
      setTargetRect(rect);
    };

    const scheduleRefresh = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(refreshRect);
    };

    const ensureTargetVisible = () => {
      const targetElement = findTarget();
      if (!targetElement) return;
      const rect = targetElement.getBoundingClientRect();
      const topLimit = 76;
      const bottomLimit = window.innerHeight - 24;
      const isVisible = rect.top >= topLimit && rect.bottom <= bottomLimit;
      if (!isVisible && typeof targetElement.scrollIntoView === "function") {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    };

    scheduleRefresh();
    ensureTargetVisible();

    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("orientationchange", scheduleRefresh);
    window.addEventListener("scroll", scheduleRefresh, true);
    document.addEventListener("transitionend", scheduleRefresh, true);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (scrollTimerId) window.clearTimeout(scrollTimerId);
        scrollTimerId = window.setTimeout(scheduleRefresh, 40);
      });
      ensureObservedTarget(findTarget());
    }

    return () => {
      if (scrollTimerId) window.clearTimeout(scrollTimerId);
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObserver && observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("orientationchange", scheduleRefresh);
      window.removeEventListener("scroll", scheduleRefresh, true);
      document.removeEventListener("transitionend", scheduleRefresh, true);
    };
  }, [open, step, step?.selector]);

  const cardPosition = useMemo(() => {
    if (!targetRect) return null;

    const cardWidth = Math.min(window.innerWidth - 32, 360);
    const cardHeight = 210;

    const belowTop = targetRect.bottom + 14;
    const aboveTop = targetRect.top - cardHeight - 14;
    const top = belowTop + cardHeight <= window.innerHeight ? belowTop : Math.max(aboveTop, 12);

    const left = clamp(
      targetRect.left + targetRect.width / 2 - cardWidth / 2,
      12,
      window.innerWidth - cardWidth - 12,
    );

    return { top, left };
  }, [targetRect]);

  if (!open || !step) return null;

  const isLast = currentStepIndex === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-overlay"
        className="fixed inset-0 z-[120]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        />

        <AnimatePresence>
          {targetRect && (
            <motion.div
              key={step.id}
              className="fixed rounded-xl border-2 border-primary pointer-events-none"
              style={{
                top: targetRect.top - 5,
                left: targetRect.left - 5,
                width: targetRect.width + 10,
                height: targetRect.height + 10,
                boxShadow: "0 0 0 9999px var(--overlay)",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cardPosition && (
            <motion.div
              key={`card-${step.id}`}
              className="fixed w-[min(360px,calc(100vw-32px))] rounded-2xl border border-border bg-card p-4 shadow-overlay"
              style={{ top: cardPosition.top, left: cardPosition.left }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <p className="text-[11px] text-primary mb-1">
                Passo {currentStepIndex + 1} de {steps.length}
              </p>
              <h3 className="text-sm text-foreground mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="ghost" className="rounded-xl" onClick={() => onClose("skip")}>Saltar</Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                    disabled={currentStepIndex === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    className="rounded-xl bg-brand-gradient text-primary-foreground border-0"
                    onClick={() => {
                      if (isLast) {
                        onClose("done");
                        return;
                      }
                      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
                    }}
                  >
                    {isLast ? "Concluir" : "Seguinte"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!cardPosition && (
            <motion.div
              key="tour-loading"
              className="fixed left-1/2 -translate-x-1/2 bottom-5 rounded-xl border border-border bg-card px-3 py-2 shadow-overlay"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">A preparar este passo...</p>
                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => onClose("skip")}>
                  Saltar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
