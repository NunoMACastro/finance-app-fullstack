import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sha256 } from "../../lib/hash.js";

export type StatsInsightStatus = "pending" | "ready" | "failed";
export type StatsInsightConfidence = "low" | "medium" | "high";
export type StatsInsightHighlightSeverity = "info" | "warning" | "positive";
export type StatsInsightRiskSeverity = "warning" | "high";
export type StatsInsightActionPriority = "high" | "medium" | "low";
export type StatsInsightCategoryKind = "expense" | "reserve";
export type StatsInsightMappingKind = StatsInsightCategoryKind | "income";

export interface StatsInsightHighlight {
  title: string;
  detail: string;
  severity: StatsInsightHighlightSeverity;
}

export interface StatsInsightRisk {
  title: string;
  detail: string;
  severity: StatsInsightRiskSeverity;
}

export interface StatsInsightAction {
  title: string;
  detail: string;
  priority: StatsInsightActionPriority;
}

export interface StatsInsightCategoryItem {
  categoryId: string;
  categoryAlias: string;
  categoryKind: StatsInsightCategoryKind;
  categoryName: string;
  colorSlot?: number;
  title: string;
  detail: string;
  action?: string;
}

export interface StatsInsightReport {
  summary: string;
  highlights: StatsInsightHighlight[];
  risks: StatsInsightRisk[];
  actions: StatsInsightAction[];
  categoryInsights: StatsInsightCategoryItem[];
  confidence: StatsInsightConfidence;
  limitations?: string[];
}

export interface StatsInsightStatusDto {
  id: string;
  periodType: "semester" | "year";
  periodKey: string;
  forecastWindow: 3 | 6;
  status: StatsInsightStatus;
  stale: boolean;
  requestedAt: string;
  generatedAt: string | null;
  model: string | null;
  report: StatsInsightReport | null;
  error: {
    code: string;
    message: string;
  } | null;
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
  colorSlot?: number;
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
    confidence: StatsInsightConfidence;
  };
}

interface AnonymizedExpenseCategoryPayload {
  alias: string;
  categoryType: StatsInsightCategoryKind;
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
    confidence: StatsInsightConfidence;
  };
  expenseCategories: AnonymizedExpenseCategoryPayload[];
  incomeCategories: AnonymizedIncomeCategoryPayload[];
}

export interface StatsInsightCategoryMapping {
  alias: string;
  categoryId: string;
  categoryName: string;
  categoryKind: StatsInsightMappingKind;
  colorSlot?: number;
}

interface OpenAiInsightResponse {
  summary: string;
  highlights: StatsInsightHighlight[];
  risks: StatsInsightRisk[];
  actions: StatsInsightAction[];
  categoryInsights: Array<{
    categoryAlias: string;
    categoryKind: StatsInsightCategoryKind;
    title: string;
    detail: string;
    action?: string;
  }>;
  confidence: StatsInsightConfidence;
  limitations?: string[];
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_ITEMS_PER_SECTION = 5;
const MAX_LIMITATIONS = 4;
const MAX_EXPENSE_CATEGORIES = 5;
const MAX_INCOME_CATEGORIES = 3;

const insightJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description:
        "Resumo executivo curto em português de Portugal, direto e acionável, sem inventar dados.",
    },
    highlights: {
      type: "array",
      maxItems: MAX_ITEMS_PER_SECTION,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: {
            type: "string",
            enum: ["info", "warning", "positive"],
          },
        },
        required: ["title", "detail", "severity"],
      },
    },
    risks: {
      type: "array",
      maxItems: MAX_ITEMS_PER_SECTION,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: {
            type: "string",
            enum: ["warning", "high"],
          },
        },
        required: ["title", "detail", "severity"],
      },
    },
    actions: {
      type: "array",
      maxItems: MAX_ITEMS_PER_SECTION,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["title", "detail", "priority"],
      },
    },
    categoryInsights: {
      type: "array",
      maxItems: MAX_ITEMS_PER_SECTION,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          categoryAlias: { type: "string" },
          categoryKind: {
            type: "string",
            enum: ["expense", "reserve"],
          },
          title: { type: "string" },
          detail: { type: "string" },
          action: { type: "string" },
        },
        required: ["categoryAlias", "categoryKind", "title", "detail", "action"],
      },
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    limitations: {
      type: "array",
      maxItems: MAX_LIMITATIONS,
      items: { type: "string" },
    },
  },
  required: ["summary", "highlights", "risks", "actions", "categoryInsights", "confidence", "limitations"],
} as const;

const insightSystemPrompt = [
  "És um analista financeiro para uma app de orçamento pessoal.",
  "Recebes apenas dados agregados e anonimizados.",
  "Responde sempre em Português de Portugal.",
  "Fala diretamente com o utilizador por tu; nunca uses você.",
  "Não inventes valores, percentagens nem causalidade.",
  "Usa apenas sinais presentes no payload.",
  "Categorias expense são despesa corrente; reserve são poupança/investimento/reserva.",
  "Usa categoryInsights apenas para aliases Cx das expense/reserve categories.",
  "Nunca uses aliases Ix em categoryInsights; income concentration deve ir para summary/highlights/risks/actions.",
  "Quando mencionares aliases no texto, usa apenas aliases presentes no payload.",
  "Não menciones limitações do dataset salvo se forem estritamente relevantes; nesse caso usa limitations.",
  "O campo limitations deve existir sempre e ser um array; usa [] quando não houver notas.",
  "Cada item de categoryInsights deve incluir sempre action; usa string vazia quando não houver ação adicional.",
  "Prefere recomendações concretas e curtas em vez de texto genérico.",
  "Devolve apenas JSON válido no formato solicitado.",
].join(" ");

const jsonObjectFallbackPrompt = [
  "Devolve apenas JSON válido.",
  "Usa exatamente estas chaves: summary, highlights, risks, actions, categoryInsights, confidence, limitations.",
  "highlights: array de objetos { title, detail, severity } onde severity e info|warning|positive.",
  "risks: array de objetos { title, detail, severity } onde severity e warning|high.",
  "actions: array de objetos { title, detail, priority } onde priority e high|medium|low.",
  "categoryInsights: array de objetos { categoryAlias, categoryKind, title, detail, action } onde categoryKind e expense|reserve e action pode ser string vazia.",
  "confidence: low|medium|high.",
  "limitations e sempre array; usa [] quando nao houver notas.",
].join(" ");

function safeTrimText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clipText(value: string, maxLength = 280): string {
  const normalized = safeTrimText(value);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace >= 60 ? lastSpace : maxLength).trim()}...`;
}

function pickLastMonths(trend: StatsTrendItemLike[], monthsLimit: number): string[] {
  return trend.slice(-monthsLimit).map((item) => item.month);
}

function indexByMonth<T extends { month: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.month, item]));
}

function buildAliasMap(categoryIds: string[], prefix: "C" | "I"): Map<string, string> {
  const sorted = [...new Set(categoryIds)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((categoryId, index) => [categoryId, `${prefix}${index + 1}`]));
}

function selectExpenseCategories(snapshot: StatsSnapshotForInsight): StatsBudgetVsActualItemLike[] {
  return [...snapshot.budgetVsActual]
    .sort((a, b) => {
      const aSignal = Math.max(Math.abs(a.actual), Math.abs(a.difference), Math.abs(a.budgeted));
      const bSignal = Math.max(Math.abs(b.actual), Math.abs(b.difference), Math.abs(b.budgeted));
      if (bSignal !== aSignal) return bSignal - aSignal;
      return a.categoryId.localeCompare(b.categoryId);
    })
    .slice(0, MAX_EXPENSE_CATEGORIES);
}

function selectIncomeCategories(snapshot: StatsSnapshotForInsight): StatsIncomeByCategoryItemLike[] {
  return [...snapshot.incomeByCategory]
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.categoryId.localeCompare(b.categoryId);
    })
    .slice(0, MAX_INCOME_CATEGORIES);
}

export function buildInsightCategoryMappings(snapshot: StatsSnapshotForInsight): StatsInsightCategoryMapping[] {
  const selectedExpenseCategories = selectExpenseCategories(snapshot);
  const selectedIncomeCategories = selectIncomeCategories(snapshot);
  const expenseAliasMap = buildAliasMap(
    selectedExpenseCategories.map((item) => item.categoryId),
    "C",
  );
  const incomeAliasMap = buildAliasMap(
    selectedIncomeCategories.map((item) => item.categoryId),
    "I",
  );

  const expenseMappings: StatsInsightCategoryMapping[] = selectedExpenseCategories.map((item) => ({
    alias: expenseAliasMap.get(item.categoryId) ?? "C0",
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryKind: item.categoryKind === "reserve" ? "reserve" : "expense",
    ...(Number.isInteger(item.colorSlot) ? { colorSlot: item.colorSlot } : {}),
  }));

  const incomeMappings: StatsInsightCategoryMapping[] = selectedIncomeCategories.map((item) => ({
    alias: incomeAliasMap.get(item.categoryId) ?? "I0",
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryKind: "income" as const,
  }));

  return [...expenseMappings, ...incomeMappings];
}

export function anonymizeStatsForInsight(
  snapshot: StatsSnapshotForInsight,
  monthsLimit = 6,
): AnonymizedStatsInsightPayload {
  const months = pickLastMonths(snapshot.trend, monthsLimit);
  const monthSet = new Set(months);
  const trend = snapshot.trend.filter((item) => monthSet.has(item.month));
  const selectedExpenseCategories = selectExpenseCategories(snapshot);
  const selectedIncomeCategories = selectIncomeCategories(snapshot);

  const mappings = buildInsightCategoryMappings({
    ...snapshot,
    budgetVsActual: selectedExpenseCategories,
    incomeByCategory: selectedIncomeCategories,
  });
  const expenseAliasMap = new Map(
    mappings
      .filter((mapping) => mapping.categoryKind === "expense" || mapping.categoryKind === "reserve")
      .map((mapping) => [mapping.categoryId, mapping.alias]),
  );
  const incomeAliasMap = new Map(
    mappings
      .filter((mapping) => mapping.categoryKind === "income")
      .map((mapping) => [mapping.categoryId, mapping.alias]),
  );

  const expenseSeriesByCategory = new Map(
    snapshot.categorySeries.map((series) => [series.categoryId, indexByMonth(series.monthly)]),
  );
  const incomeSeriesByCategory = new Map(
    snapshot.incomeCategorySeries.map((series) => [series.categoryId, indexByMonth(series.monthly)]),
  );

  const expenseCategories: AnonymizedExpenseCategoryPayload[] = selectedExpenseCategories.map((item) => {
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

  const incomeCategories: AnonymizedIncomeCategoryPayload[] = selectedIncomeCategories.map((item) => {
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

export function buildInsightInputHash(payload: AnonymizedStatsInsightPayload): string {
  return sha256(JSON.stringify(payload));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHighlights(value: unknown): StatsInsightHighlight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item): StatsInsightHighlight => ({
      title: clipText(String(item.title ?? ""), 90),
      detail: clipText(String(item.detail ?? ""), 220),
      severity:
        item.severity === "warning" || item.severity === "positive"
          ? item.severity
          : "info",
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, MAX_ITEMS_PER_SECTION);
}

function parseRisks(value: unknown): StatsInsightRisk[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item): StatsInsightRisk => ({
      title: clipText(String(item.title ?? ""), 90),
      detail: clipText(String(item.detail ?? ""), 220),
      severity: item.severity === "high" ? "high" : "warning",
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, MAX_ITEMS_PER_SECTION);
}

function parseActions(value: unknown): StatsInsightAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item): StatsInsightAction => ({
      title: clipText(String(item.title ?? ""), 90),
      detail: clipText(String(item.detail ?? ""), 220),
      priority:
        item.priority === "high" || item.priority === "low"
          ? item.priority
          : "medium",
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, MAX_ITEMS_PER_SECTION);
}

function parseCategoryInsights(
  value: unknown,
): OpenAiInsightResponse["categoryInsights"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item): OpenAiInsightResponse["categoryInsights"][number] => ({
      categoryAlias: safeTrimText(String(item.categoryAlias ?? "")),
      categoryKind: item.categoryKind === "reserve" ? "reserve" : "expense",
      title: clipText(String(item.title ?? ""), 90),
      detail: clipText(String(item.detail ?? ""), 220),
      ...(safeTrimText(String(item.action ?? ""))
        ? { action: clipText(String(item.action ?? ""), 180) }
        : {}),
    }))
    .filter((item) => item.categoryAlias && item.title && item.detail)
    .slice(0, MAX_ITEMS_PER_SECTION);
}

export function parseInsightStructuredOutput(rawText: string): OpenAiInsightResponse | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const summary = clipText(String(parsed.summary ?? ""), 280);
    if (!summary) return null;

    const confidence: StatsInsightConfidence =
      parsed.confidence === "low" || parsed.confidence === "high"
        ? parsed.confidence
        : "medium";
    const limitations = Array.isArray(parsed.limitations)
      ? parsed.limitations
          .map((item) => clipText(String(item ?? ""), 160))
          .filter(Boolean)
          .slice(0, MAX_LIMITATIONS)
      : undefined;

    return {
      summary,
      highlights: parseHighlights(parsed.highlights),
      risks: parseRisks(parsed.risks),
      actions: parseActions(parsed.actions),
      categoryInsights: parseCategoryInsights(parsed.categoryInsights),
      confidence,
      ...(limitations && limitations.length > 0 ? { limitations } : {}),
    };
  } catch {
    return null;
  }
}

function extractOutputText(responseBody: unknown): string | null {
  if (!isObject(responseBody)) return null;

  if (typeof responseBody.output_text === "string" && responseBody.output_text.trim()) {
    return responseBody.output_text;
  }

  const output = responseBody.output;
  if (!Array.isArray(output)) return null;

  for (const outputItem of output) {
    if (!isObject(outputItem) || !Array.isArray(outputItem.content)) continue;
    for (const contentItem of outputItem.content) {
      if (!isObject(contentItem)) continue;
      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function buildOpenAiRequestBody(
  payload: AnonymizedStatsInsightPayload,
  format:
    | {
        type: "json_schema";
        name: string;
        schema: typeof insightJsonSchema;
        description: string;
        strict: boolean;
      }
    | { type: "json_object" },
): Record<string, unknown> {
  const inputText =
    format.type === "json_object"
      ? `JSON payload:\n${JSON.stringify(payload)}`
      : JSON.stringify(payload);

  return {
    model: env.OPENAI_INSIGHT_MODEL,
    instructions:
      format.type === "json_schema"
        ? insightSystemPrompt
        : `${insightSystemPrompt} ${jsonObjectFallbackPrompt}`,
    input: inputText,
    max_output_tokens: 900,
    text: {
      format,
    },
  };
}

async function sendOpenAiInsightRequest(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json?: unknown;
  errorText?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OPENAI_INSIGHT_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorText,
      };
    }

    const json = (await response.json()) as unknown;
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function replaceAliases(text: string, mappings: StatsInsightCategoryMapping[]): string {
  const normalized = safeTrimText(text);
  if (!normalized) return normalized;

  return [...mappings]
    .sort((a, b) => b.alias.length - a.alias.length)
    .reduce((current, mapping) => {
      return current.replace(new RegExp(`\\b${mapping.alias}\\b`, "g"), mapping.categoryName);
    }, normalized);
}

export function remapInsightOutput(
  output: OpenAiInsightResponse,
  mappings: StatsInsightCategoryMapping[],
): StatsInsightReport {
  const mappingByAlias = new Map(mappings.map((mapping) => [mapping.alias, mapping]));

  const categoryInsights: StatsInsightCategoryItem[] = output.categoryInsights
    .map((item) => {
      const mapping = mappingByAlias.get(item.categoryAlias);
      if (!mapping) return null;
      if (mapping.categoryKind !== "expense" && mapping.categoryKind !== "reserve") return null;

      return {
        categoryId: mapping.categoryId,
        categoryAlias: item.categoryAlias,
        categoryKind: mapping.categoryKind,
        categoryName: mapping.categoryName,
        ...(Number.isInteger(mapping.colorSlot) ? { colorSlot: mapping.colorSlot } : {}),
        title: replaceAliases(item.title, mappings),
        detail: replaceAliases(item.detail, mappings),
        ...(item.action ? { action: replaceAliases(item.action, mappings) } : {}),
      };
    })
    .filter((item): item is StatsInsightCategoryItem => item !== null);

  return {
    summary: replaceAliases(output.summary, mappings),
    highlights: output.highlights.map((item) => ({
      ...item,
      title: replaceAliases(item.title, mappings),
      detail: replaceAliases(item.detail, mappings),
    })),
    risks: output.risks.map((item) => ({
      ...item,
      title: replaceAliases(item.title, mappings),
      detail: replaceAliases(item.detail, mappings),
    })),
    actions: output.actions.map((item) => ({
      ...item,
      title: replaceAliases(item.title, mappings),
      detail: replaceAliases(item.detail, mappings),
    })),
    categoryInsights,
    confidence: output.confidence,
    ...(output.limitations?.length
      ? {
          limitations: output.limitations.map((item) => replaceAliases(item, mappings)),
        }
      : {}),
  };
}

export async function requestStructuredStatsInsight(
  payload: AnonymizedStatsInsightPayload,
): Promise<OpenAiInsightResponse | null> {
  if (env.NODE_ENV === "test") {
    return null;
  }

  if (!env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const primaryResponse = await sendOpenAiInsightRequest(
      buildOpenAiRequestBody(payload, {
        type: "json_schema",
        name: "finance_stats_insight",
        description: "Structured financial insight report for personal budgeting stats.",
        strict: true,
        schema: insightJsonSchema,
      }),
    );

    let responseBody = primaryResponse.json;
    let usedFallback = false;

    if (!primaryResponse.ok) {
      logger.warn(
        {
          status: primaryResponse.status,
          statusText: primaryResponse.statusText,
          errorText: primaryResponse.errorText?.slice(0, 600),
        },
        "OpenAI stats insight request failed",
      );

      if (primaryResponse.status !== 400) {
        return null;
      }

      const fallbackResponse = await sendOpenAiInsightRequest(
        buildOpenAiRequestBody(payload, {
          type: "json_object",
        }),
      );

      if (!fallbackResponse.ok) {
        logger.warn(
          {
            status: fallbackResponse.status,
            statusText: fallbackResponse.statusText,
            errorText: fallbackResponse.errorText?.slice(0, 600),
          },
          "OpenAI stats insight fallback request failed",
        );
        return null;
      }

      responseBody = fallbackResponse.json;
      usedFallback = true;
    }

    const outputText = extractOutputText(responseBody);
    if (!outputText) {
      logger.warn("OpenAI stats insight response did not include output text");
      return null;
    }

    const parsed = parseInsightStructuredOutput(outputText);
    if (!parsed) {
      logger.warn(
        {
          usedFallback,
          outputPreview: outputText.slice(0, 600),
        },
        "OpenAI stats insight output was not valid JSON schema",
      );
      return null;
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("OpenAI stats insight request timed out");
      return null;
    }

    logger.warn({ err: error }, "OpenAI stats insight request errored");
    return null;
  }
}
