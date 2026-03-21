import { expect, test, type Page, type Route } from "@playwright/test";

type ThemePalette = "brisa" | "calma" | "aurora" | "terra" | "mare" | "amber" | "ciano";

interface MockUser {
  id: string;
  email: string;
  name: string;
  currency: string;
  tutorialSeenAt: string | null;
  personalAccountId: string;
  preferences: {
    themePalette: ThemePalette;
    hideAmountsByDefault: boolean;
  };
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page: Page) {
  let isAuthenticated = false;

  const user: MockUser = {
    id: "u-e2e-1",
    email: "e2e@example.com",
    name: "E2E User",
    currency: "EUR",
    tutorialSeenAt: "2026-03-01T12:00:00.000Z",
    personalAccountId: "acc-e2e-1",
    preferences: {
      themePalette: "ciano",
      hideAmountsByDefault: false,
    },
  };

  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;

    if (path === "/api/v1/auth/login" && method === "POST") {
      isAuthenticated = true;
      return json(route, 200, {
        tokens: {
          accessToken: "access-token-e2e",
          refreshToken: "refresh-token-e2e",
        },
        user,
      });
    }

    if (path === "/api/v1/auth/register" && method === "POST") {
      isAuthenticated = true;
      return json(route, 201, {
        tokens: {
          accessToken: "access-token-e2e",
          refreshToken: "refresh-token-e2e",
        },
        user,
      });
    }

    if (path === "/api/v1/auth/me" && method === "GET") {
      if (!isAuthenticated) {
        return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
      }
      return json(route, 200, user);
    }

    if (path === "/api/v1/auth/me/profile" && method === "PATCH") {
      const payload = req.postDataJSON() as { preferences?: { themePalette?: string } };
      const next = payload.preferences?.themePalette;
      if (next === "amber" || next === "brisa" || next === "calma" || next === "aurora" || next === "terra" || next === "mare" || next === "ciano") {
        user.preferences.themePalette = next;
      }
      return json(route, 200, user);
    }

    if (path === "/api/v1/accounts" && method === "GET") {
      return json(route, 200, [
        {
          id: "acc-e2e-1",
          name: "Conta pessoal",
          type: "personal",
          role: "owner",
          isPersonalDefault: true,
        },
      ]);
    }

    if (path === "/api/v1/transactions" && method === "GET") {
      const month = url.searchParams.get("month") ?? "2026-03";
      return json(route, 200, {
        month,
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        incomeTransactions: [],
        expenseTransactions: [],
      });
    }

    if (path.startsWith("/api/v1/budgets/") && method === "GET") {
      const month = path.replace("/api/v1/budgets/", "");
      return json(route, 200, {
        accountId: "acc-e2e-1",
        month,
        totalBudget: 0,
        categories: [],
        isReady: false,
      });
    }

    if (path === "/api/v1/income-categories" && method === "GET") {
      return json(route, 200, [
        {
          id: "income-default",
          accountId: "acc-e2e-1",
          name: "Outras receitas",
          active: true,
          isDefault: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }

    if (path === "/api/v1/auth/logout" && method === "POST") {
      isAuthenticated = false;
      return route.fulfill({ status: 204 });
    }

    if (path === "/api/v1/auth/refresh" && method === "POST") {
      if (!isAuthenticated) {
        return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) });
      }
      return json(route, 200, {
        accessToken: "access-token-e2e",
      });
    }

    return json(route, 200, {});
  });
}

async function loginViaUi(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel("Password").fill("1234567890");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Terminar sessão" })).toBeVisible();
}

test.describe("E2E smoke", () => {
  test("public entry applies default ciano theme before auth", async ({ page }) => {
    await installApiMocks(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Poupérrimo" })).toBeVisible();
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(theme).toBe("ciano");
  });

  test("register/login basic flow reaches authenticated month screen", async ({ page }) => {
    await installApiMocks(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Regista-te" }).click();
    await page.getByLabel("Nome").fill("E2E User");
    await page.getByLabel("Email").fill("e2e@example.com");
    await page.getByLabel("Password").fill("1234567890");
    await page.getByLabel("Confirmar").fill("1234567890");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByRole("button", { name: "Terminar sessão" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar orçamento" })).toBeVisible();
    await expect(page.getByText("Sem categorias de despesas neste mês")).toBeVisible();
  });

  test("theme change persists after refresh", async ({ page }) => {
    await installApiMocks(page);
    await loginViaUi(page);

    await page.goto("/profile/preferences");
    await page.locator("select").selectOption("amber");

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
      .toBe("amber");
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem("finance_v2.theme")))
      .toBe("amber");

    await page.reload();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
      .toBe("amber");
  });
});
