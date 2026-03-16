import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
}));

const patchNotesMocks = vi.hoisted(() => ({
  fetchLoginPatchNotes: vi.fn().mockResolvedValue({
    visible: true,
    version: "v2.1.0",
    updatedAt: "Atualizado em 2026-03-15",
    changes: ["Melhoria 1", "Melhoria 2"],
    instructions: [],
  }),
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => authMocks,
}));

vi.mock("../lib/login-patch-notes", () => ({
  fetchLoginPatchNotes: patchNotesMocks.fetchLoginPatchNotes,
}));

import { AuthPage } from "./auth-page";

describe("AuthPage", () => {
  test("renders login mode by default with hero wave", async () => {
    render(<AuthPage />);

    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("Ainda não tens conta?")).toBeInTheDocument();
    expect(screen.getByTestId("auth-hero-wave")).toBeInTheDocument();

    expect(await screen.findByText("Notas v2.1.0")).toBeInTheDocument();
    expect(screen.getByText("- Melhoria 1")).toBeInTheDocument();
  });

  test("switches login -> register -> login and keeps patch notes visible", async () => {
    render(<AuthPage />);

    await screen.findByText("Notas v2.1.0");

    fireEvent.click(screen.getByRole("button", { name: "Regista-te" }));
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeInTheDocument();
    expect(screen.getByText("Notas v2.1.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByText("Notas v2.1.0")).toBeInTheDocument();
  });
});
