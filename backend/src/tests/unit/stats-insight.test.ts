import { describe, expect, test } from "vitest";
import {
  StatsInsightMemoStore,
  anonymizeStatsForInsight,
  buildInsightCacheKey,
  parseInsightStructuredOutput,
  type StatsAiInsight,
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
        categoryName: "Despesas fixas",
        categoryKind: "reserve",
        budgeted: 3200,
        actual: 3000,
        difference: 200,
      },
    ],
    categorySeries: [
      {
        categoryId: "cat_a",
        categoryName: "Despesas fixas",
        monthly: trend.map((item, index) => ({
          month: item.month,
          budgeted: 300 + index * 4,
          actual: 280 + index * 5,
        })),
      },
      {
        categoryId: "cat_b",
        categoryName: "Lazer",
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
  test("anonymizeStatsForInsight keeps only last six months and anonymizes categories deterministically", () => {
    const snapshot = buildSnapshotFixture();
    const anonymized = anonymizeStatsForInsight(snapshot, 6);

    expect(anonymized.months).toEqual(["2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08"]);
    expect(anonymized.trend).toHaveLength(6);

    expect(anonymized.expenseCategories).toHaveLength(2);
    expect(anonymized.expenseCategories[0]?.alias).toBe("C2");
    expect(anonymized.expenseCategories[1]?.alias).toBe("C1");
    expect(anonymized.expenseCategories[0]?.categoryType).toBe("expense");
    expect(anonymized.expenseCategories[1]?.categoryType).toBe("reserve");
    expect(anonymized.expenseCategories[0]?.budgetStatus).toBe("over");
    expect(anonymized.expenseCategories[0]?.totalRemaining).toBe(0);
    expect(anonymized.expenseCategories[0]?.totalOvershoot).toBe(200);
    expect(anonymized.expenseCategories[1]?.budgetStatus).toBe("under");
    expect(anonymized.expenseCategories[1]?.totalRemaining).toBe(200);
    expect(anonymized.expenseCategories[1]?.totalOvershoot).toBe(0);
    expect(anonymized.expenseCategories[0]?.monthly).toHaveLength(6);
    expect(anonymized.expenseCategories[1]?.monthly).toHaveLength(6);

    expect(anonymized.incomeCategories).toHaveLength(2);
    expect(anonymized.incomeCategories[0]?.alias).toBe("I2");
    expect(anonymized.incomeCategories[1]?.alias).toBe("I1");
    expect(anonymized.incomeCategories[0]?.monthly).toHaveLength(6);
    expect(anonymized.incomeCategories[1]?.monthly).toHaveLength(6);

    expect(JSON.stringify(anonymized)).not.toContain("Despesas fixas");
    expect(JSON.stringify(anonymized)).not.toContain("Freelance");
  });

  test("parseInsightStructuredOutput extracts the expected field", () => {
    expect(parseInsightStructuredOutput('{"insight":"  Ajusta 12% em C1 para recuperar margem.  "}')).toBe(
      "Ajusta 12% em C1 para recuperar margem.",
    );
    expect(parseInsightStructuredOutput('{"message":"wrong"}')).toBeNull();
    expect(parseInsightStructuredOutput("not-json")).toBeNull();
  });

  test("buildInsightCacheKey is deterministic for same payload", () => {
    const payload = anonymizeStatsForInsight(buildSnapshotFixture(), 6);
    const keyA = buildInsightCacheKey({
      accountId: "acc_1",
      forecastWindow: 6,
      payload,
    });
    const keyB = buildInsightCacheKey({
      accountId: "acc_1",
      forecastWindow: 6,
      payload,
    });

    expect(keyA).toBe(keyB);
  });

  test("StatsInsightMemoStore respects ttl and de-duplicates in-flight requests", async () => {
    let now = 1_000;
    const store = new StatsInsightMemoStore(() => now);
    const value: StatsAiInsight = {
      text: "Ritmo estável.",
      source: "ai",
      generatedAt: new Date(0).toISOString(),
      model: "gpt-4.1-mini",
    };

    store.set("key", value, 2);
    expect(store.get("key")).toEqual(value);
    now = 3_500;
    expect(store.get("key")).toBeNull();

    let calls = 0;
    const dedupeValue: StatsAiInsight = {
      text: "Prioriza corte em C1.",
      source: "ai",
      generatedAt: new Date(0).toISOString(),
      model: "gpt-4.1-mini",
    };

    const factory = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return dedupeValue;
    };

    const [a, b, c] = await Promise.all([
      store.runWithDedupe("same", factory),
      store.runWithDedupe("same", factory),
      store.runWithDedupe("same", factory),
    ]);

    expect(calls).toBe(1);
    expect(a).toEqual(dedupeValue);
    expect(b).toEqual(dedupeValue);
    expect(c).toEqual(dedupeValue);
  });
});
