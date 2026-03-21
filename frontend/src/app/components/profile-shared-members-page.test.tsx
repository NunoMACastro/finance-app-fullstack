import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { ProfileSharedMembersPage } from "./profile-shared-members-page";

const useAccountMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/account-context", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("ProfileSharedMembersPage", () => {
  test("shows a forbidden page when the active account is not shared", () => {
    useAccountMock.mockReturnValue({
      activeAccount: {
        id: "acc-1",
        name: "Conta pessoal",
        type: "personal",
        role: "owner",
      },
      activeAccountRole: "owner",
      generateInviteCode: vi.fn(),
      listMembers: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProfileSharedMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Membros e convites" })).toBeInTheDocument();
    expect(screen.getByText("Esta secção só está disponível numa conta partilhada ativa.")).toBeInTheDocument();
  });
});
