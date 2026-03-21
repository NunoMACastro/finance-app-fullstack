import { describe, expect, test } from "vitest";
import {
  anonymizeStatsForInsight,
  buildInsightCategoryMappings,
  buildInsightInputHash,
  parseInsightStructuredOutput,
  remapInsightOutput,
  type StatsSnapshotForInsight,
} from "../../modules/stats/insight.service.js";

function buildSnapshotFixture(): StatsSnapshotForInsight {
  const trend = Array.from({ length: 8 }, (_, index) => {
    const month = `2025-${String(index + 1).padStart(2, "0")}`;
    return {
      month,
      income: 1500 + index * 20,
      expense: 900 + index * 15,
      balance: 600 + index * 5,
    };
  });

  return {
    periodType: "year",
    periodKey: "2025",
    totals: {
      totalIncome: 14000,
      totalExpense: 9000,
      balance: 5000,
    },
    trend,
    budgetVsActual: [
      {
        categoryId: "cat_b",
        categoryName: "Lazer",
        categoryKind: "expense",
        budgeted: 1800,
        actual: 2000,
        difference: -200,
      },
      {
        categoryId: "cat_a",
        categoryName: "Investimento",
        categoryKind: "reserve",
        budgeted: 3200,
        actual: 3000,
        difference: 200,
      },
    ],
    categorySeries: [
      {
        categoryId: "cat_a",
        categoryName: "Investimento",
        categoryKind: "reserve",
        monthly: trend.map((item, index) => ({
          month: item.month,
          budgeted: 300 + index * 4,
          actual: 280 + index * 5,
        })),
      },
      {
        categoryId: "cat_b",
        categoryName: "Lazer",
        categoryKind: "expense",
        monthly: trend.map((item, index) => ({
          month: item.month,
          budgeted: 180 + index * 3,
          actual: 200 + index * 2,
        })),
      },
    ],
    incomeByCategory: [
      {
        categoryId: "inc_b",
        categoryName: "Freelance",
        amount: 1400,
        percent: 10,
      },
      {
        categoryId: "inc_a",
        categoryName: "Salario",
        amount: 12600,
        percent: 90,
      },
    ],
    incomeCategorySeries: [
      {
        categoryId: "inc_a",
        categoryName: "Salario",
        monthly: trend.map((item, index) => ({
          month: item.month,
          amount: 1400 + index * 20,
        })),
      },
      {
        categoryId: "inc_b",
        categoryName: "Freelance",
        monthly: trend.map((item, index) => ({
          month: item.month,
          amount: index % 2 === 0 ? 220 : 120,
        })),
      },
    ],
    forecast: {
      projectedIncome: 1700,
      projectedExpense: 1100,
      projectedBalance: 600,
      windowMonths: 6,
      sampleSize: 6,
      confidence: "high",
    },
  };
}

describe("stats insight helpers", () => {
  test("anonymizeStatsForInsight keeps only last months and anonymizes categories deterministically", () => {
    const snapshot = buildSnapshotFixture();
    const anonymized = anonymizeStatsForInsight(snapshot, 6);

    expect(anonymized.months).toEqual(["2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08"]);
    expect(anonymized.trend).toHaveLength(6);

    expect(anonymized.expenseCategories).toHaveLength(2);
    expect(anonymized.expenseCategories[0]?.alias).toBe("C1");
    expect(anonymized.expenseCategories[1]?.alias).toBe("C2");
    expect(anonymized.incomeCategories[0]?.alias).toBe("I1");
    expect(anonymized.incomeCategories[1]?.alias).toBe("I2");
    expect(JSON.stringify(anonymized)).not.toContain("Investimento");
    expect(JSON.stringify(anonymized)).not.toContain("Freelance");
  });

  test("buildInsightInputHash is deterministic for same payload", () => {
    const payload = anonymizeStatsForInsight(buildSnapshotFixture(), 6);
    const hashA = buildInsightInputHash(payload);
    const hashB = buildInsightInputHash(payload);

    expect(hashA).toBe(hashB);
  });

  test("parseInsightStructuredOutput extracts structured report", () => {
    const parsed = parseInsightStructuredOutput(
      JSON.stringify({
        summary: " Ajusta o foco em C1 para recuperar margem. ",
        highlights: [{ title: "Pressão", detail: "C1 subiu este período.", severity: "warning" }],
        risks: [{ title: "Margem", detail: "I1 continua demasiado concentrado.", severity: "high" }],
        actions: [{ title: "Cortar", detail: "Reduz 10% em C1.", priority: "high" }],
        categoryInsights: [
          {
            categoryAlias: "C1",
            categoryKind: "expense",
            title: "Categoria mais pressionada",
            detail: "C1 excedeu o esperado.",
            action: "Revê esta categoria semanalmente.",
          },
        ],
        confidence: "medium",
        limitations: ["Horizonte curto."],
      }),
    );

    expect(parsed?.summary).toBe("Ajusta o foco em C1 para recuperar margem.");
    expect(parsed?.highlights[0]?.severity).toBe("warning");
    expect(parsed?.actions[0]?.priority).toBe("high");
    expect(parsed?.categoryInsights[0]?.categoryAlias).toBe("C1");
  });

  test("remapInsightOutput replaces aliases and resolves category mappings", () => {
    const snapshot = buildSnapshotFixture();
    const mappings = buildInsightCategoryMappings(snapshot);
    const report = remapInsightOutput(
      {
        summary: "C1 continua a ser a categoria crítica e I1 concentra demasiado rendimento.",
        highlights: [{ title: "C1 apertado", detail: "C1 já excedeu o budget.", severity: "warning" }],
        risks: [{ title: "Dependência", detail: "I1 pesa demasiado no total.", severity: "high" }],
        actions: [{ title: "Revê C1", detail: "Define um teto semanal em C1.", priority: "high" }],
        categoryInsights: [
          {
            categoryAlias: "C1",
            categoryKind: "reserve",
            title: "C1 a exigir atenção",
            detail: "C1 precisa de consistência.",
            action: "Mantém o plano de C1.",
          },
        ],
        confidence: "medium",
        limitations: ["Ler I1 com cautela."],
      },
      mappings,
    );

    expect(report.summary).toContain("Investimento");
    expect(report.summary).toContain("Salario");
    expect(report.categoryInsights[0]?.categoryId).toBe("cat_a");
    expect(report.categoryInsights[0]?.categoryName).toBe("Investimento");
    expect(report.limitations?.[0]).toContain("Salario");
  });
});
