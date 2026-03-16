import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");
const THEMES_DIR = path.join(SRC_DIR, "styles", "themes");

const INCLUDED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const EXCLUDED_FILES = new Set();
const EXCLUDED_DIR_FRAGMENTS = [`${path.sep}imports${path.sep}`];

const hardcodedUtilityPattern =
  /\b(?:bg|text|border|from|to|via|ring|shadow|stroke|fill)-(?:sky|cyan|blue|red|green|yellow|pink|violet|indigo|teal|amber|lime|orange|fuchsia|rose|emerald|slate|gray|zinc|neutral|stone|white|black)(?:-[^\s"'`)]*)?/g;
const literalColorPattern = /#(?:[0-9a-fA-F]{3,8})\b|\brgba?\(|\bhsla?\(/g;

function walk(dir, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(filePath, collector);
      continue;
    }
    if (!INCLUDED_EXTENSIONS.has(path.extname(filePath))) continue;
    if (EXCLUDED_FILES.has(filePath)) continue;
    if (filePath.startsWith(THEMES_DIR + path.sep)) continue;
    if (EXCLUDED_DIR_FRAGMENTS.some((fragment) => filePath.includes(fragment))) continue;
    collector.push(filePath);
  }
}

function findViolations(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];
  const patterns = [
    { name: "hardcoded-utility", regex: hardcodedUtilityPattern },
    { name: "literal-color", regex: literalColorPattern },
  ];

  for (const { name, regex } of patterns) {
    regex.lastIndex = 0;
    for (const match of content.matchAll(regex)) {
      const index = match.index ?? 0;
      const before = content.slice(0, index);
      const line = before.split("\n").length;
      const lineText = content.split("\n")[line - 1]?.trim() ?? "";
      violations.push({
        filePath,
        line,
        kind: name,
        token: match[0],
        lineText,
      });
    }
  }

  return violations;
}

const files = [];
walk(SRC_DIR, files);

const violations = files.flatMap(findViolations);

if (violations.length > 0) {
  console.error("Token guardrail failed. Hardcoded colors detected:\n");
  for (const violation of violations) {
    const relativePath = path.relative(ROOT, violation.filePath);
    console.error(
      `- ${relativePath}:${violation.line} [${violation.kind}] ${violation.token}\n  ${violation.lineText}`,
    );
  }
  process.exit(1);
}

console.log(`Token guardrail passed (${files.length} files checked).`);
