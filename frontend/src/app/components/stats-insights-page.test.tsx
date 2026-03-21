import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const statsApiMocks = vi.hoisted(() => ({
  requestInsight: vi.fn(),
  getInsight: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());
const searchParamsState = vi.hoisted(() => new URLSearchParams("period=semester&forecastWindow=3&from=/stats"));
const setSearchParamsMock = vi.hoisted(() => vi.fn((next: Record<string, string>) => {
  searchParamsState.forEach((_value, key) => searchParamsState.delete(key));
  Object.entries(next).forEach(([key, value]) => {
    searchParamsState.set(key, value);
  });
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: { currency: "EUR" },
  }),
}));

vi.mock("../lib/api", () => ({
  statsApi: {
    requestInsight: statsApiMocks.requestInsight,
    getInsight: statsApiMocks.getInsight,
  },
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
      summary: "O período está estável, mas Despesas continua a ser o principal foco.",
      highlights: [
        {
          title: "Consumo concentrado",
          detail: "Despesas absorve a maior parte do orçamento disponível.",
          severity: "warning" as const,
        },
      ],
      risks: [],
      actions: [],
      categoryInsights: [],
      confidence: "medium" as const,
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
    searchParamsState.forEach((_value, key) => searchParamsState.delete(key));
    searchParamsState.set("period", "semester");
    searchParamsState.set("forecastWindow", "3");
    searchParamsState.set("from", "/stats");
  });

  test("does not auto-generate insight on load", async () => {
    render(<StatsInsightsPage />);

    expect(await screen.findByRole("button", { name: "Gerar insight IA" })).toBeInTheDocument();
    expect(statsApiMocks.requestInsight).not.toHaveBeenCalled();
    expect(statsApiMocks.getInsight).not.toHaveBeenCalled();
  });

  test("requests insight only after user action and renders report when ready", async () => {
    statsApiMocks.requestInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar insight IA" }));

    await waitFor(() => {
      expect(statsApiMocks.requestInsight).toHaveBeenCalledWith({
        periodType: "semester",
        forecastWindow: 3,
      });
    });

    expect(await screen.findByText("O período está estável, mas Despesas continua a ser o principal foco.")).toBeInTheDocument();
  });

  test("polls when insight starts pending", async () => {
    statsApiMocks.requestInsight.mockResolvedValue({
      ...buildReadyInsight(),
      status: "pending" as const,
      report: null,
      generatedAt: null,
    });
    statsApiMocks.getInsight.mockResolvedValue(buildReadyInsight());

    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Gerar insight IA" }));

    expect(await screen.findByText("A gerar insight...")).toBeInTheDocument();

    await waitFor(() => {
      expect(statsApiMocks.getInsight).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    }, { timeout: 2500 });
  });

  test("back button returns to stats", async () => {
    render(<StatsInsightsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(navigateMock).toHaveBeenCalledWith("/stats");
  });
});
