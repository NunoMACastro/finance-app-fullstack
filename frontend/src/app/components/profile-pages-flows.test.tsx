import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ProfileAccountPage } from "./profile-account-page";
import { ProfilePreferencesPage } from "./profile-preferences-page";
import { ProfileSecurityPage } from "./profile-security-page";

const useAuthMock = vi.hoisted(() => vi.fn());
const themePrefsMock = vi.hoisted(() => ({
  setTheme: vi.fn().mockResolvedValue(undefined),
}));
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../lib/theme-preferences", () => ({
  useThemePreferences: () => ({
    theme: "brisa",
    setTheme: themePrefsMock.setTheme,
    isSaving: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

describe("profile pages flows", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    themePrefsMock.setTheme.mockReset().mockResolvedValue(undefined);
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  test("updates profile details, email and exports account data", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const updateEmail = vi.fn().mockResolvedValue(undefined);
    const exportData = vi.fn().mockResolvedValue({
      hello: "world",
    });
    const deleteMe = vi.fn().mockResolvedValue(undefined);
    const user = {
      id: "user_1",
      name: "Nuno",
      email: "nuno@example.com",
      currency: "EUR",
      preferences: { hideAmountsByDefault: false },
    };

    useAuthMock.mockReturnValue({
      user,
      updateProfile,
      updateEmail,
      exportData,
      deleteMe,
    });

    const createObjectURL = vi.fn(() => "blob:profile-export");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(window.URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
    });

    render(
      <MemoryRouter>
        <ProfileAccountPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Nome"), { target: { value: "Nuno 2" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ name: "Nuno 2", currency: "USD" });
    });

    fireEvent.change(screen.getByPlaceholderText("Novo email"), {
      target: { value: "novo@example.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("Password atual")[0], {
      target: { value: "current-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar email" }));

    await waitFor(() => {
      expect(updateEmail).toHaveBeenCalledWith("current-pass", "novo@example.com");
    });

    fireEvent.click(screen.getByRole("button", { name: "Exportar JSON" }));

    await waitFor(() => {
      expect(exportData).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText("APAGAR"), { target: { value: "APAGAR" } });
    fireEvent.change(screen.getAllByPlaceholderText("Password atual")[1], {
      target: { value: "current-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Desativar conta" }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeInTheDocument();
    });

    const dialog = document.querySelector('[data-slot="alert-dialog-content"]');
    expect(dialog).not.toBeNull();
    fireEvent.click(within(dialog as HTMLElement).getByRole("button", { name: "Desativar conta" }));

    await waitFor(() => {
      expect(deleteMe).toHaveBeenCalledWith("current-pass");
    });
  });

  test("revokes sessions and removes revoked sessions", async () => {
    const listSessions = vi.fn().mockResolvedValue([
      {
        jti: "session-active",
        deviceInfo: "iPhone",
        createdAt: "2026-03-01T10:00:00.000Z",
        expiresAt: "2026-04-01T10:00:00.000Z",
        revokedAt: null,
      },
      {
        jti: "session-revoked",
        deviceInfo: "MacBook",
        createdAt: "2026-02-01T10:00:00.000Z",
        expiresAt: "2026-03-01T10:00:00.000Z",
        revokedAt: "2026-03-10T10:00:00.000Z",
      },
    ]);
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    const revokeAllSessions = vi.fn().mockResolvedValue(undefined);
    const removeRevokedSessions = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      user: {
        id: "user_1",
        name: "Nuno",
        email: "nuno@example.com",
        currency: "EUR",
        preferences: { hideAmountsByDefault: false },
      },
      updatePassword: vi.fn().mockResolvedValue(undefined),
      listSessions,
      revokeSession,
      revokeAllSessions,
      removeRevokedSessions,
    });

    render(
      <MemoryRouter>
        <ProfileSecurityPage />
      </MemoryRouter>,
    );

    await screen.findByText("iPhone");

    fireEvent.click(screen.getByRole("button", { name: "Revogar sessão" }));
    await waitFor(() => {
      expect(revokeSession).toHaveBeenCalledWith("session-active");
    });

    fireEvent.click(screen.getByRole("button", { name: "Revogar todas as sessões" }));
    await waitFor(() => {
      expect(revokeAllSessions).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Remover sessões revogadas (1)" }));
    await waitFor(() => {
      expect(removeRevokedSessions).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByLabelText("Remover sessão revogada"));
    await waitFor(() => {
      expect(revokeSession).toHaveBeenCalledWith("session-revoked");
    });
  });

  test("switches theme, saves preferences and resets tutorial", async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const resetTutorial = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      user: {
        id: "user_1",
        name: "Nuno",
        email: "nuno@example.com",
        currency: "EUR",
        preferences: { hideAmountsByDefault: false },
      },
      updateProfile,
      resetTutorial,
    });

    render(
      <MemoryRouter>
        <ProfilePreferencesPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByDisplayValue("Brisa"), { target: { value: "terra" } });
    await waitFor(() => {
      expect(themePrefsMock.setTheme).toHaveBeenCalledWith("terra");
    });

    fireEvent.click(screen.getByRole("switch", { name: "Ocultar valores por defeito" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar preferências" }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        preferences: {
          hideAmountsByDefault: true,
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset tutorial" }));
    await waitFor(() => {
      expect(resetTutorial).toHaveBeenCalledTimes(1);
    });
  });
});
