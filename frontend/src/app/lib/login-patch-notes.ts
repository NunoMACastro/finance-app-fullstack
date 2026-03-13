export interface LoginPatchNotes {
  visible: boolean;
  version: string;
  updatedAt?: string;
  changes: string[];
  instructions: string[];
}

const BULLET_LINE_PATTERN = /^[-*+]\s+(.+)$/;
const ORDERED_LINE_PATTERN = /^\d+\.\s+(.+)$/;
const H1_PATTERN = /^#\s+(.+)$/;
const VISIBILITY_TRIGGER_PATTERN = /^<!--\s*show-patch-notes:\s*(true|false)\s*-->$/i;

function normaliseHeading(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function getSectionFromHeading(heading: string): "changes" | "instructions" | null {
  const normalised = normaliseHeading(heading);

  if (
    normalised.includes("o que mudou") ||
    normalised.includes("novidades") ||
    normalised.includes("changes") ||
    normalised.includes("whats new")
  ) {
    return "changes";
  }

  if (
    normalised.includes("instruc") ||
    normalised.includes("important") ||
    normalised.includes("acao necessaria") ||
    normalised.includes("acoes necessarias")
  ) {
    return "instructions";
  }

  return null;
}

export function parseLoginPatchNotes(markdown: string): LoginPatchNotes {
  const lines = markdown.split(/\r?\n/);
  let version = "Patch notes";
  let updatedAt: string | undefined;
  let visibilityOverride: boolean | undefined;
  let currentSection: "changes" | "instructions" | null = null;
  const changes: string[] = [];
  const instructions: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const visibilityMatch = line.match(VISIBILITY_TRIGGER_PATTERN);
    if (visibilityMatch) {
      visibilityOverride = visibilityMatch[1].toLowerCase() === "true";
      continue;
    }

    const h1Match = line.match(H1_PATTERN);
    if (h1Match) {
      version = h1Match[1].trim();
      continue;
    }

    if (!updatedAt && line.startsWith(">")) {
      updatedAt = line.replace(/^>\s*/, "").trim();
      continue;
    }

    if (line.startsWith("##")) {
      const heading = line.replace(/^##+\s*/, "").trim();
      currentSection = getSectionFromHeading(heading);
      continue;
    }

    const bulletMatch = line.match(BULLET_LINE_PATTERN) ?? line.match(ORDERED_LINE_PATTERN);
    if (!bulletMatch || !currentSection) continue;

    if (currentSection === "changes") {
      changes.push(bulletMatch[1].trim());
    } else {
      instructions.push(bulletMatch[1].trim());
    }
  }

  const hasContent = changes.length > 0 || instructions.length > 0;

  return {
    visible: visibilityOverride ?? hasContent,
    version,
    updatedAt,
    changes,
    instructions,
  };
}

export async function fetchLoginPatchNotes(path = "/login-patch-notes.md"): Promise<LoginPatchNotes | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Patch notes indisponiveis (${response.status})`);
    }

    const markdown = await response.text();
    const parsed = parseLoginPatchNotes(markdown);
    return parsed.visible ? parsed : null;
  } catch {
    return null;
  }
}
