import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const statsApiMocks = vi.hoisted(() => ({
  requestInsight: vi.fn(),
  getInsight: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());
const accountState = vi.hoisted(() => ({ activeAccountId: "acc_test" }));
const searchParamsState = vi.hoisted(() => new URLSearchParams("period=semester&forecastWindow=3&from=/stats"));
const setSearchParamsMock = vi.hoisted(() => vi.fn((next: Record<string, string>) => {
  searchParamsState.forEach((_value, key) => searchParamsState.delete(key));
  Object.entries(next).forEach(([key, value]) => {
    searchParamsState.set(key, value);
  });
}));

vi.mock("../lib/api", () => ({
  statsApi: {
    requestInsight: statsApiMocks.requestInsight,
    getInsight: statsApiMocks.getInsight,
  },
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => accountState,
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [searchParamsState, setSearchParamsMock],
  };
});

import { StatsInsightsPage } from "./stats-insights-page";

function buildReadyInsight() {
  return {
    id: "507f1f77bcf86cd799439011",
    periodType: "semester" as const,
    periodKey: "2026-S1",
    forecastWindow: 3 as const,
    status: "ready" as const,
    stale: false,
    requestedAt: "2026-03-20T18:00:00.000Z",
    generatedAt: "2026-03-20T18:00:03.000Z",
    model: "gpt-4.1-mini",
    error: null,
    report: {
      summary:
        "Manténs um saldo confortável, mas a dependência de uma única fonte de rendimento continua a ser o risco principal neste período e merece uma resposta prática.",
      highlights: [
        {
          title: "Saldo positivo consistente",
          detail: "O saldo foi sempre positivo nos seis meses.",
          severity: "positive" as const,
        },
        {
          title: "Poupança abaixo do planeado",
          detail: "A reserva ainda está abaixo da meta definida.",
          severity: "warning" as const,
        },
      ],
      risks: [
        {
          title: "Dependência elevada de uma única fonte de rendimento",
          detail: "93% do rendimento vem da categoria Salário.",
          severity: "high" as const,
        },
        {
          title: "Reserva mensal abaixo do objetivo",
          detail: "A reserva ainda não está a acompanhar o valor planeado.",
          severity: "warning" as const,
        },
      ],
      actions: [
        {
          title: "Diversificar fontes de rendimento",
          detail: "Reduz a dependência da categoria principal.",
          priority: "high" as const,
        },
        {
          title: "Aumentar poupança mensal",
          detail: "Reforça a categoria de reserva em cada mês.",
          priority: "medium" as const,
        },
      ],
      categoryInsights: [
        {
          categoryId: "cat-reserve",
          categoryAlias: "C6",
          categoryKind: "reserve" as const,
          categoryName: "Poupança",
          colorSlot: 6,
          title: "Poupança insuficiente",
          detail: "Ficou abaixo do objetivo acumulado.",
          action: "Aumenta os depósitos mensais nesta categoria.",
        },
        {
          categoryId: "cat-market",
          categoryAlias: "C2",
          categoryKind: "expense" as const,
          categoryName: "Mercado",
          colorSlot: 2,
          title: "Despesa Mercado controlada",
          detail: "A categoria continua abaixo do orçamento.",
          action: "Mantém a disciplina atual.",
        },
        {
          categoryId: "cat-home",
          categoryAlias: "C1",
          categoryKind: "expense" as const,
          categoryName: "Habitação",
          title: "Habitação estável",
          detail: "Os custos mantiveram-se dentro do esperado.",
        },
        {
          categoryId: "cat-mobility",
          categoryAlias: "C3",
          categoryKind: "expense" as const,
          categoryName: "Mobilidade",
          colorSlot: 3,
          title: "Mobilidade muito abaixo do orçamento",
          detail: "Há margem relevante nesta categoria.",
          action: "Confirma se o orçamento atual continua ajustado.",
        },
      ],
      confidence: "medium" as const,
      limitations: [
        "O insight usa histórico financeiro recente.",
      ],
    },
  };
}

describe("StatsInsightsPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    navigateMock.mockReset();
    setSearchParamsMock.mockClear();
    statsApiMocks.requestInsight.mockReset();
    statsApiMocks.getInsight.mockReset();
    accountState.activeAccountId = "acc_test";
    searchParamsState.forEach((_value, key) => searchParamsState.delete(key));
    searchParamsState.set("period", "semester");
    searchParamsState.set("forecastWindow", "3");
    searchParamsState.set("from", "/stats");
  });

  test("does not auto-generate insight on load", async () => {
    render(<StatsInsightsPage />);

    expect(await screen.findByRole("button", { name: "Gerar análise IA" })).toBeInTheDocument();
    expect(statsApiMocks.requestInsight).not.toHaveBeenCalled();
    expect(statsApiMocks.getInsight).not.toHaveBeenCalled();
  });

  test("requests insight only after user action and renders now tab by default", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    await waitFor(() => {
      expect(statsApiMocks.requestInsight).toHaveBeenCalledWith({
        periodType: "semester",
        forecastWindow: 3,
      });
    });

    const priorities = await screen.findByTestId("stats-insight-priorities");
    expect(screen.getByRole("button", { name: "Agora" })).toHaveAttribute("aria-pressed", "true");
    expect(within(priorities).getByText("Dependência elevada de uma única fonte de rendimento")).toBeInTheDocument();
    expect(within(priorities).getByText("Diversificar fontes de rendimento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver mais" })).not.toBeInTheDocument();
  });

  test("prioritises risk high before medium actions", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    const priorities = await screen.findByTestId("stats-insight-priorities");
    const rows = within(priorities).getAllByTestId("stats-insight-now-row");

    expect(rows[0]).toHaveTextContent("Dependência elevada de uma única fonte de rendimento");
    expect(rows[1]).toHaveTextContent("Diversificar fontes de rendimento");
    expect(rows[2]).toHaveTextContent("Reserva mensal abaixo do objetivo");
  });

  test("shows sorted actions in actions tab", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    fireEvent.click(await screen.findByRole("button", { name: "Ações" }));

    const actionsTab = await screen.findByTestId("stats-insight-tab-actions");
    expect(actionsTab).toHaveTextContent("Diversificar fontes de rendimento");
    expect(actionsTab).toHaveTextContent("Aumentar poupança mensal");
    expect(screen.queryByRole("button", { name: /Highlights/i })).not.toBeInTheDocument();
  });

  test("shows all categories in categories tab", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    fireEvent.click(await screen.findByRole("button", { name: "Categorias" }));

    const categories = await screen.findByTestId("stats-insight-categories");
    expect(categories.querySelectorAll("article")).toHaveLength(4);
    expect(within(screen.getByTestId("stats-insight-category-cat-market")).getByText("Despesa")).toHaveClass("bg-category-soft-2");
    expect(within(screen.getByTestId("stats-insight-category-cat-home")).getByText("Despesa")).toHaveClass("bg-surface-soft");
    expect(screen.queryByRole("button", { name: "Ver todas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mostrar menos" })).not.toBeInTheDocument();
  });

  test("does not render collapsible sections anymore", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    expect(await screen.findByTestId("stats-insight-tab-now")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Highlights/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Riscos/i })).not.toBeInTheDocument();
  });

  test("polls when insight starts pending", async () => {
    vi.useFakeTimers();
    statsApiMocks.requestInsight.mockResolvedValue({
      ...buildReadyInsight(),
      status: "pending" as const,
      report: null,
      generatedAt: null,
    });
    statsApiMocks.getInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gerar análise IA" }));
      await Promise.resolve();
    });
    expect(screen.getAllByText("A gerar análise...")).toHaveLength(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });

  test("retries polling after transient failures and recovers", async () => {
    vi.useFakeTimers();
    statsApiMocks.requestInsight.mockResolvedValue({
      ...buildReadyInsight(),
      status: "pending" as const,
      report: null,
      generatedAt: null,
    });
    statsApiMocks.getInsight
      .mockRejectedValueOnce(new Error("timeout-1"))
      .mockRejectedValueOnce(new Error("timeout-2"))
      .mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gerar análise IA" }));
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledTimes(3);

    expect(screen.getByText("Dependência elevada de uma única fonte de rendimento")).toBeInTheDocument();
    expect(screen.queryByText("Verificação automática em pausa")).not.toBeInTheDocument();
  });

  test("suspends polling after repeated failures and allows manual resume", async () => {
    vi.useFakeTimers();
    statsApiMocks.requestInsight.mockResolvedValue({
      ...buildReadyInsight(),
      status: "pending" as const,
      report: null,
      generatedAt: null,
    });
    statsApiMocks.getInsight
      .mockRejectedValueOnce(new Error("timeout-1"))
      .mockRejectedValueOnce(new Error("timeout-2"))
      .mockRejectedValueOnce(new Error("timeout-3"))
      .mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gerar análise IA" }));
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText("Verificação automática em pausa")).toBeInTheDocument();
    expect(screen.getByText("Falhas consecutivas: 3")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retomar verificação" }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Dependência elevada de uma única fonte de rendimento")).toBeInTheDocument();
  });

  test("resets the page when the active account changes", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    const { rerender } = render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar análise IA" }));

    expect(await screen.findByText("Dependência elevada de uma única fonte de rendimento")).toBeInTheDocument();

    accountState.activeAccountId = "acc_shared";
    rerender(<StatsInsightsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Dependência elevada de uma única fonte de rendimento")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Gerar análise IA" })).toBeInTheDocument();
  });

  test("ignores delayed polling responses after account change", async () => {
    vi.useFakeTimers();
    statsApiMocks.requestInsight.mockResolvedValue({
      ...buildReadyInsight(),
      status: "pending" as const,
      report: null,
      generatedAt: null,
    });

    let resolveInsight: ((value: ReturnType<typeof buildReadyInsight>) => void) | null = null;
    statsApiMocks.getInsight.mockImplementation(
      () => new Promise((resolve) => {
        resolveInsight = resolve as (value: ReturnType<typeof buildReadyInsight>) => void;
      }),
    );

    const { rerender } = render(<StatsInsightsPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Gerar análise IA" }));
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(statsApiMocks.getInsight).toHaveBeenCalledTimes(1);

    accountState.activeAccountId = "acc_shared";
    rerender(<StatsInsightsPage />);

    await act(async () => {
      resolveInsight?.(buildReadyInsight());
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Gerar análise IA" })).toBeInTheDocument();
    expect(screen.queryByText("Dependência elevada de uma única fonte de rendimento")).not.toBeInTheDocument();
  });

  test("back button returns to stats", async () => {
    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(navigateMock).toHaveBeenCalledWith("/stats");
  });
});
