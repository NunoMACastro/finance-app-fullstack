import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router";
import { CircleAlert } from "lucide-react";
import { StatusPage } from "./status-page";

describe("StatusPage", () => {
  test.each([
    ["brand", "999"],
    ["info", "503"],
    ["warning", "404"],
    ["danger", "403"],
  ] as const)("renders the %s tone with code %s", (tone, code) => {
    render(
      <MemoryRouter>
        <StatusPage
          code={code}
          title={`Estado ${code}`}
          description="Mensagem de teste"
          icon={CircleAlert}
          tone={tone}
          actions={[
            {
              label: "Ir para teste",
              to: "/teste",
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: `Estado ${code}` })).toBeInTheDocument();
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para teste" })).toHaveAttribute("href", "/teste");
  });
});
