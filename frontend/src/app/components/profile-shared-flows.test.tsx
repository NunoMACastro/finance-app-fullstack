import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { ProfileSharedAccountsPage } from "./profile-shared-accounts-page";
import { ProfileSharedCreatePage } from "./profile-shared-create-page";
import { ProfileSharedJoinPage } from "./profile-shared-join-page";

const useAccountMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

describe("shared account flows", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  test("creates a shared account and clears the form", async () => {
    const createSharedAccount = vi.fn().mockResolvedValue({
      id: "shared_1",
      name: "Família",
      type: "shared",
      role: "owner",
    });

    useAccountMock.mockReturnValue({
      createSharedAccount,
    });

    render(
      <MemoryRouter>
        <ProfileSharedCreatePage />
      </MemoryRouter>,
    );

    const nameInput = screen.getByPlaceholderText("Família, Casa, Viagem...");
    fireEvent.change(nameInput, { target: { value: "Família" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => {
      expect(createSharedAccount).toHaveBeenCalledWith("Família");
    });
    expect((nameInput as HTMLInputElement).value).toBe("");
    expect(toastMock.success).toHaveBeenCalledWith("Conta partilhada criada");
  });

  test("joins a shared account by uppercase invite code", async () => {
    const joinByCode = vi.fn().mockResolvedValue({
      id: "shared_2",
      name: "Casa",
      type: "shared",
      role: "viewer",
    });

    useAccountMock.mockReturnValue({
      joinByCode,
    });

    render(
      <MemoryRouter>
        <ProfileSharedJoinPage />
      </MemoryRouter>,
    );

    const codeInput = screen.getByPlaceholderText("ABC123");
    fireEvent.change(codeInput, { target: { value: "abc123" } });
    expect((codeInput as HTMLInputElement).value).toBe("ABC123");

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(joinByCode).toHaveBeenCalledWith("ABC123");
    });
    expect((codeInput as HTMLInputElement).value).toBe("");
    expect(toastMock.success).toHaveBeenCalledWith("Entraste na conta");
  });

  test("switches the active shared account from the account hub", async () => {
    const setActiveAccount = vi.fn();

    useAccountMock.mockReturnValue({
      accounts: [
        { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
        { id: "shared_1", name: "Família", type: "shared", role: "editor" },
      ],
      activeAccount: { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
      activeAccountId: "personal",
      setActiveAccount,
      leaveAccount: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProfileSharedAccountsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));

    expect(setActiveAccount).toHaveBeenCalledWith("shared_1");
  });

  test("leaves the active shared account after confirmation", async () => {
    const leaveAccount = vi.fn().mockResolvedValue(undefined);

    useAccountMock.mockReturnValue({
      accounts: [
        { id: "personal", name: "Pessoal", type: "personal", role: "owner" },
        { id: "shared_1", name: "Família", type: "shared", role: "owner" },
      ],
      activeAccount: { id: "shared_1", name: "Família", type: "shared", role: "owner" },
      activeAccountId: "shared_1",
      setActiveAccount: vi.fn(),
      leaveAccount,
    });

    render(
      <MemoryRouter>
        <ProfileSharedAccountsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sair da conta ativa" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(leaveAccount).toHaveBeenCalledWith("shared_1");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Saíste da conta partilhada");
  });
});
