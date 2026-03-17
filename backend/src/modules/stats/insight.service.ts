import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sha256 } from "../../lib/hash.js";

export interface StatsAiInsight {
  text: string;
  source: "ai";
  generatedAt: string;
  model: string;
}

interface StatsTrendItemLike {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface StatsBudgetVsActualItemLike {
  categoryId: string;
  categoryName: string;
  categoryKind?: "expense" | "reserve";
  budgeted: number;
  actual: number;
  difference: number;
}

interface StatsCategorySeriesItemLike {
  categoryId: string;
  categoryName: string;
  categoryKind?: "expense" | "reserve";
  monthly: Array<{
    month: string;
    budgeted: number;
    actual: number;
  }>;
}

interface StatsIncomeByCategoryItemLike {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
}

interface StatsIncomeCategorySeriesItemLike {
  categoryId: string;
  categoryName: string;
  monthly: Array<{
    month: string;
    amount: number;
  }>;
}

export interface StatsSnapshotForInsight {
  periodType: "semester" | "year";
  periodKey: string;
  totals: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  trend: StatsTrendItemLike[];
  budgetVsActual: StatsBudgetVsActualItemLike[];
  categorySeries: StatsCategorySeriesItemLike[];
  incomeByCategory: StatsIncomeByCategoryItemLike[];
  incomeCategorySeries: StatsIncomeCategorySeriesItemLike[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
    windowMonths: 3 | 6;
    sampleSize: number;
    confidence: "low" | "medium" | "high";
  };
}

interface AnonymizedExpenseCategoryPayload {
  alias: string;
  categoryType: "expense" | "reserve";
  budgetStatus: "under" | "over" | "on_target";
  totalBudgeted: number;
  totalActual: number;
  totalDifference: number;
  totalRemaining: number;
  totalOvershoot: number;
  monthly: Array<{
    month: string;
    budgeted: number;
    actual: number;
    difference: number;
    budgetStatus: "under" | "over" | "on_target";
    remaining: number;
    overshoot: number;
  }>;
}

interface AnonymizedIncomeCategoryPayload {
  alias: string;
  totalAmount: number;
  percent: number;
  monthly: Array<{
    month: string;
    amount: number;
  }>;
}

export interface AnonymizedStatsInsightPayload {
  periodType: "semester" | "year";
  periodKey: string;
  months: string[];
  totals: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  trend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
    windowMonths: 3 | 6;
    sampleSize: number;
    confidence: "low" | "medium" | "high";
  };
  expenseCategories: AnonymizedExpenseCategoryPayload[];
  incomeCategories: AnonymizedIncomeCategoryPayload[];
}

interface BuildInsightCacheKeyInput {
  accountId: string;
  forecastWindow: 3 | 6;
  payload: AnonymizedStatsInsightPayload;
}

interface GenerateStatsInsightInput {
  accountId: string;
  forecastWindow: 3 | 6;
  snapshot: StatsSnapshotForInsight;
}

interface InsightCacheEntry {
  value: StatsAiInsight;
  expiresAtMs: number;
}

const MAX_INSIGHT_TEXT_LENGTH = 420;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const insightJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    insight: {
      type: "string",
      description:
        "Insight financeiro em português de Portugal, em tom direto por tu, 1-2 frases curtas e acionáveis, sem inventar dados.",
    },
  },
  required: ["insight"],
} as const;

const insightSystemPrompt = [
  "És um analista financeiro para uma app de orçamento pessoal.",
  "Recebes apenas dados agregados e anonimizados (sem nomes de categorias reais).",
  "Responde sempre em Português de Portugal.",
  "Fala diretamente com o utilizador por tu; nunca uses você.",
  "Gera exatamente 1 a 2 frases curtas com recomendação acionável (idealmente <= 220 caracteres).",
  "Usa números presentes nos dados; não inventes valores nem factos.",
  "No payload, categorias com categoryType='reserve' representam poupança/investimento/reserva.",
  "Interpretação de budgetStatus: over=excedeu orçamento, under=sobrou orçamento, on_target=em linha.",
  "Nunca afirmes que uma categoria excedeu quando budgetStatus for under ou on_target.",
  "Não trates baixa execução em reservas como problema nem recomendes gastar esse montante.",
  "Prioriza recomendações sobre categoryType='expense' quando houver desvios.",
  "Não menciones limitações do dataset nem o facto de estar anonimizado.",
  "Devolve apenas JSON válido no formato solicitado.",
].join(" ");

function safeTrimText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickLastMonths(trend: StatsTrendItemLike[], monthsLimit: number): string[] {
  return trend.slice(-monthsLimit).map((item) => item.month);
}

function indexByMonth<T extends { month: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.month, item]));
}

function buildAliasMap(categoryIds: string[], prefix: "C" | "I"): Map<string, string> {
  const sorted = [...categoryIds].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((categoryId, index) => [categoryId, `${prefix}${index + 1}`]));
}

export function anonymizeStatsForInsight(
  snapshot: StatsSnapshotForInsight,
  monthsLimit = 6,
): AnonymizedStatsInsightPayload {
  const months = pickLastMonths(snapshot.trend, monthsLimit);
  const monthSet = new Set(months);
  const trend = snapshot.trend.filter((item) => monthSet.has(item.month));

  const expenseCategoryIds = snapshot.budgetVsActual.map((item) => item.categoryId);
  const incomeCategoryIds = snapshot.incomeByCategory.map((item) => item.categoryId);
  const expenseAliasMap = buildAliasMap(expenseCategoryIds, "C");
  const incomeAliasMap = buildAliasMap(incomeCategoryIds, "I");

  const expenseSeriesByCategory = new Map(
    snapshot.categorySeries.map((series) => [series.categoryId, indexByMonth(series.monthly)]),
  );
  const incomeSeriesByCategory = new Map(
    snapshot.incomeCategorySeries.map((series) => [series.categoryId, indexByMonth(series.monthly)]),
  );

  const expenseCategories: AnonymizedExpenseCategoryPayload[] = snapshot.budgetVsActual.map((item) => {
    const alias = expenseAliasMap.get(item.categoryId) ?? "C0";
    const monthlySeries = expenseSeriesByCategory.get(item.categoryId) ?? new Map();
    const totalDifference = item.difference;
    const totalRemaining = Math.round(Math.max(totalDifference, 0) * 100) / 100;
    const totalOvershoot = Math.round(Math.max(-totalDifference, 0) * 100) / 100;
    const budgetStatus: "under" | "over" | "on_target" =
      totalOvershoot > 0 ? "over" : totalRemaining > 0 ? "under" : "on_target";

    return {
      alias,
      categoryType: item.categoryKind === "reserve" ? "reserve" : "expense",
      budgetStatus,
      totalBudgeted: item.budgeted,
      totalActual: item.actual,
      totalDifference,
      totalRemaining,
      totalOvershoot,
      monthly: months.map((month) => {
        const monthEntry = monthlySeries.get(month);
        const budgeted = monthEntry?.budgeted ?? 0;
        const actual = monthEntry?.actual ?? 0;
        const difference = Math.round((budgeted - actual) * 100) / 100;
        const remaining = Math.round(Math.max(difference, 0) * 100) / 100;
        const overshoot = Math.round(Math.max(-difference, 0) * 100) / 100;
        const monthBudgetStatus: "under" | "over" | "on_target" =
          overshoot > 0 ? "over" : remaining > 0 ? "under" : "on_target";
        return {
          month,
          budgeted,
          actual,
          difference,
          budgetStatus: monthBudgetStatus,
          remaining,
          overshoot,
        };
      }),
    };
  });

  const incomeCategories: AnonymizedIncomeCategoryPayload[] = snapshot.incomeByCategory.map((item) => {
    const alias = incomeAliasMap.get(item.categoryId) ?? "I0";
    const monthlySeries = incomeSeriesByCategory.get(item.categoryId) ?? new Map();

    return {
      alias,
      totalAmount: item.amount,
      percent: item.percent,
      monthly: months.map((month) => ({
        month,
        amount: monthlySeries.get(month)?.amount ?? 0,
      })),
    };
  });

  return {
    periodType: snapshot.periodType,
    periodKey: snapshot.periodKey,
    months,
    totals: snapshot.totals,
    trend,
    forecast: snapshot.forecast,
    expenseCategories,
    incomeCategories,
  };
}

export function buildInsightCacheKey(input: BuildInsightCacheKeyInput): string {
  const payloadHash = sha256(JSON.stringify(input.payload));
  return [
    input.accountId,
    input.payload.periodType,
    input.payload.periodKey,
    String(input.forecastWindow),
    payloadHash,
  ].join("|");
}

export function parseInsightStructuredOutput(rawText: string): string | null {
  try {
    const parsed = JSON.parse(rawText) as { insight?: unknown };
    if (typeof parsed.insight !== "string") {
      return null;
    }
    const text = safeTrimText(parsed.insight);
    if (!text) return null;
    if (text.length <= MAX_INSIGHT_TEXT_LENGTH) return text;

    const clipped = text.slice(0, MAX_INSIGHT_TEXT_LENGTH);
    const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
    if (sentenceEnd >= 80) {
      return clipped.slice(0, sentenceEnd + 1).trim();
    }

    const wordEnd = clipped.lastIndexOf(" ");
    return `${clipped.slice(0, wordEnd >= 80 ? wordEnd : MAX_INSIGHT_TEXT_LENGTH).trim()}...`;
  } catch {
    return null;
  }
}

function extractOutputText(responseBody: unknown): string | null {
  if (typeof responseBody !== "object" || responseBody === null) return null;

  const withOutputText = responseBody as { output_text?: unknown };
  if (typeof withOutputText.output_text === "string" && withOutputText.output_text.trim()) {
    return withOutputText.output_text;
  }

  const withOutput = responseBody as {
    output?: Array<{
      type?: unknown;
      content?: Array<{ type?: unknown; text?: unknown }>;
    }>;
  };
  if (!Array.isArray(withOutput.output)) return null;

  for (const outputItem of withOutput.output) {
    if (!Array.isArray(outputItem.content)) continue;
    for (const contentItem of outputItem.content) {
      if (contentItem.type !== "output_text") continue;
      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  return null;
}

export class StatsInsightMemoStore {
  private readonly cache = new Map<string, InsightCacheEntry>();
  private readonly inFlight = new Map<string, Promise<StatsAiInsight | null>>();

  constructor(private readonly nowFn: () => number = () => Date.now()) {}

  get(key: string): StatsAiInsight | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (hit.expiresAtMs <= this.nowFn()) {
      this.cache.delete(key);
      return null;
    }
    return hit.value;
  }

  set(key: string, value: StatsAiInsight, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAtMs: this.nowFn() + ttlSeconds * 1000,
    });
  }

  async runWithDedupe(
    key: string,
    factory: () => Promise<StatsAiInsight | null>,
  ): Promise<StatsAiInsight | null> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const runPromise = factory().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, runPromise);
    return runPromise;
  }
}

const insightStore = new StatsInsightMemoStore();

async function requestInsightFromOpenAi(
  payload: AnonymizedStatsInsightPayload,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENAI_INSIGHT_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OPENAI_INSIGHT_MODEL,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: insightSystemPrompt }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(payload),
              },
            ],
          },
        ],
        max_output_tokens: 180,
        text: {
          format: {
            type: "json_schema",
            name: "stats_insight_response",
            strict: true,
            schema: insightJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn(
        {
          statusCode: response.status,
          body: errorBody.slice(0, 300),
        },
        "OpenAI stats insight request failed",
      );
      return null;
    }

    const body = (await response.json()) as unknown;
    return extractOutputText(body);
  } catch (error) {
    if (controller.signal.aborted) {
      logger.warn(
        { timeoutMs: env.OPENAI_INSIGHT_TIMEOUT_MS },
        "OpenAI stats insight request timed out",
      );
      return null;
    }

    logger.warn({ err: error }, "OpenAI stats insight request errored");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStatsInsight(
  input: GenerateStatsInsightInput,
): Promise<StatsAiInsight | null> {
  if (env.NODE_ENV === "test") return null;
  if (!env.OPENAI_API_KEY) return null;

  const anonymizedPayload = anonymizeStatsForInsight(input.snapshot);
  const cacheKey = buildInsightCacheKey({
    accountId: input.accountId,
    forecastWindow: input.forecastWindow,
    payload: anonymizedPayload,
  });

  const cached = insightStore.get(cacheKey);
  if (cached) return cached;

  return insightStore.runWithDedupe(cacheKey, async () => {
    const rawOutput = await requestInsightFromOpenAi(anonymizedPayload);
    if (!rawOutput) return null;

    const parsedText = parseInsightStructuredOutput(rawOutput);
    if (!parsedText) {
      logger.warn("OpenAI stats insight output was not valid JSON schema");
      return null;
    }

    const insight: StatsAiInsight = {
      text: parsedText,
      source: "ai",
      generatedAt: new Date().toISOString(),
      model: env.OPENAI_INSIGHT_MODEL,
    };
    insightStore.set(cacheKey, insight, env.OPENAI_INSIGHT_CACHE_TTL_SECONDS);
    return insight;
  });
}
