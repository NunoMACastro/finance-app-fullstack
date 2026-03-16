import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  logout: vi.fn().mockResolvedValue(undefined),
  completeTutorial: vi.fn().mockResolvedValue(undefined),
  toggleAmountVisibility: vi.fn(),
}));

const accountState = vi.hoisted(() => ({
  accounts: [{ id: "personal", name: "Pessoal", type: "personal", role: "owner" }] as Array<{
    id: string;
    name: string;
    type: "personal" | "shared";
    role: string;
  }>,
  activeAccountId: "personal",
  setActiveAccount: vi.fn(),
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      tutorialSeenAt: "2026-01-01T00:00:00.000Z",
    },
    logout: authMocks.logout,
    completeTutorial: authMocks.completeTutorial,
    isAmountsHidden: false,
    toggleAmountVisibility: authMocks.toggleAmountVisibility,
  }),
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    accounts: accountState.accounts,
    activeAccountId: accountState.activeAccountId,
    setActiveAccount: accountState.setActiveAccount,
  }),
}));

vi.mock("./tutorial-tour", () => ({
  TutorialTour: ({ showAccountSelectStep }: { showAccountSelectStep?: boolean }) => (
    <div
      data-testid="tutorial-tour-props"
      data-show-account-select-step={String(Boolean(showAccountSelectStep))}
    />
  ),
}));

import { AppLayout } from "./layout";

function renderLayout(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div>Mês</div>} />
          <Route path="stats" element={<div>Stats</div>} />
          <Route path="profile" element={<div>Perfil</div>} />
          <Route path="profile/shared/create" element={<div>Shared Create</div>} />
          <Route path="budget/:month/edit" element={<div>Budget</div>} />
          <Route path="month/:month/category/:categoryId/movements" element={<div>Movimentos</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppLayout account selector visibility", () => {
  beforeEach(() => {
    accountState.accounts = [{ id: "personal", name: "Pessoal", type: "personal", role: "owner" }];
    accountState.activeAccountId = "personal";
    accountState.setActiveAccount.mockReset();
  });

  test("não mostra seletor quando só existe conta pessoal", () => {
    renderLayout("/");
    expect(screen.queryByLabelText("Selecionar conta ativa")).not.toBeInTheDocument();
    expect(screen.getByTestId("tutorial-tour-props")).toHaveAttribute("data-show-account-select-step", "false");
  });

  test("mostra seletor no mês quando há conta partilhada", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/");
    expect(screen.getByLabelText("Selecionar conta ativa")).toBeInTheDocument();
    expect(screen.getByTestId("tutorial-tour-props")).toHaveAttribute("data-show-account-select-step", "true");
  });

  test("mostra seletor em stats quando há conta partilhada", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/stats");
    expect(screen.getByLabelText("Selecionar conta ativa")).toBeInTheDocument();
  });

  test("não mostra seletor no budget editor", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/budget/2026-03/edit");
    expect(screen.queryByLabelText("Selecionar conta ativa")).not.toBeInTheDocument();
  });

  test("não mostra seletor no perfil", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/profile");
    expect(screen.queryByLabelText("Selecionar conta ativa")).not.toBeInTheDocument();
  });

  test("não mostra seletor no ecrã de movimentos da categoria", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/month/2026-03/category/cat_1/movements");
    expect(screen.queryByLabelText("Selecionar conta ativa")).not.toBeInTheDocument();
  });

  test("não mostra seletor nas subrotas de partilha do perfil", () => {
    accountState.accounts = [
      { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      { id: "shared_1", name: "Família", type: "shared", role: "owner" },
    ];

    renderLayout("/profile/shared/create");
    expect(screen.queryByLabelText("Selecionar conta ativa")).not.toBeInTheDocument();
  });
});
