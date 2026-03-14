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
    description: "Este dropdown troca entre o teu espaço pessoal e os orçamentos partilhados.",
  },
  {
    id: "header-actions-menu",
    selector: '[data-tour="header-actions-menu"]',
    title: "Ações rápidas",
    description: "Aqui tens criar conta partilhada, entrar por código, gerir membros e ajuda.",
  },
  {
    id: "header-visibility-toggle",
    selector: '[data-tour="header-visibility-toggle"]',
    title: "Privacidade visual",
    description: "Alterna mostrar/ocultar montantes sem alterar a tua preferência guardada.",
  },
  {
    id: "header-profile-badge",
    selector: '[data-tour="header-profile-badge"]',
    title: "Perfil",
    description: "Este badge mostra o teu utilizador atual.",
  },
  {
    id: "header-logout",
    selector: '[data-tour="header-logout"]',
    title: "Sair",
    description: "Termina a sessão e volta ao ecrã de autenticação.",
  },
];

const TOUR_STEPS_BY_SCOPE: Record<TourScope, TourStep[]> = {
  month: [
    ...HEADER_TOUR_STEPS,
    {
      id: "month-nav",
      selector: '[data-tour="month-nav"]',
      title: "Navegação mensal",
      description: "Aqui mudas rapidamente entre meses para veres histórico ou voltares ao mês atual.",
    },
    {
      id: "month-add",
      selector: '[data-tour="month-add-transaction"]',
      title: "Novo lançamento",
      description: "Usa este botão para criar receitas e despesas manuais do mês selecionado.",
    },
    {
      id: "month-budget",
      selector: '[data-tour="month-budget-button"]',
      title: "Criação de orçamento",
      description: "Abre o editor de orçamento, aplica templates e define a distribuição por categorias.",
    },
    {
      id: "month-tabs",
      selector: '[data-tour="month-view-tabs"]',
      title: "Separação por tipo",
      description: "Alterna entre vista de despesas e receitas para manter o controlo do fluxo mensal.",
    },
    {
      id: "month-categories",
      selector: '[data-tour="month-categories"]',
      title: "Categorias do orçamento",
      description: "Cada categoria mostra o valor alocado, gasto atual e o restante disponível.",
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
  onClose,
}: {
  open: boolean;
  scope: TourScope;
  onClose: (reason: "done" | "skip") => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = TOUR_STEPS_BY_SCOPE[scope];
  const step = steps[stepIndex];

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setTargetRect(null);
  }, [open, scope]);

  useEffect(() => {
    if (!open) return;
    setTargetRect(null);
  }, [open, step.id]);

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
      if (!isVisible) {
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
  }, [open, step.selector]);

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

  if (!open) return null;

  const isLast = stepIndex === steps.length - 1;

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
                Passo {stepIndex + 1} de {steps.length}
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
                    disabled={stepIndex === 0}
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
