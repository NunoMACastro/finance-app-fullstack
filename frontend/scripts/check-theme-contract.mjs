import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const THEMES_DIR = path.join(SRC_DIR, "styles", "themes");
const TEMPLATE_FILE = path.join(THEMES_DIR, "_template.css");

const TOKEN_PATTERN = /--t-[a-z0-9-]+\s*:/g;
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const DARK_PATTERN = /\bdark:[^\s"'`]+/g;

function readTokens(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return new Set((content.match(TOKEN_PATTERN) ?? []).map((token) => token.replace(/\s*:\s*$/, "")));
}

function formatSet(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function walk(dir, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(filePath, collector);
      continue;
    }
    if (!FILE_EXTENSIONS.has(path.extname(filePath))) continue;
    collector.push(filePath);
  }
}

if (!fs.existsSync(TEMPLATE_FILE)) {
  console.error("Missing template file:", path.relative(ROOT, TEMPLATE_FILE));
  process.exit(1);
}

const requiredTokens = readTokens(TEMPLATE_FILE);
const themeFiles = fs
  .readdirSync(THEMES_DIR)
  .filter((file) => file.endsWith(".css") && file !== "_template.css")
  .map((file) => path.join(THEMES_DIR, file));

if (themeFiles.length === 0) {
  console.error("No runtime theme files found in src/styles/themes");
  process.exit(1);
}

const contractErrors = [];
for (const themeFile of themeFiles) {
  const tokens = readTokens(themeFile);
  const missing = new Set([...requiredTokens].filter((token) => !tokens.has(token)));
  const extra = new Set([...tokens].filter((token) => !requiredTokens.has(token)));

  if (missing.size > 0 || extra.size > 0) {
    contractErrors.push({
      file: path.relative(ROOT, themeFile),
      missing: formatSet(missing),
      extra: formatSet(extra),
    });
  }
}

if (contractErrors.length > 0) {
  console.error("Theme contract check failed.\n");
  for (const error of contractErrors) {
    console.error(`- ${error.file}`);
    if (error.missing.length > 0) {
      console.error(`  missing: ${error.missing.join(", ")}`);
    }
    if (error.extra.length > 0) {
      console.error(`  extra: ${error.extra.join(", ")}`);
    }
  }
  process.exit(1);
}

const srcFiles = [];
walk(SRC_DIR, srcFiles);

const darkClassViolations = [];
for (const filePath of srcFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const match of content.matchAll(DARK_PATTERN)) {
    const index = match.index ?? 0;
    const line = content.slice(0, index).split("\n").length;
    const lineText = content.split("\n")[line - 1]?.trim() ?? "";
    darkClassViolations.push({
      file: path.relative(ROOT, filePath),
      line,
      token: match[0],
      lineText,
    });
  }
}

if (darkClassViolations.length > 0) {
  console.error("Theme contract check failed. dark: variants are not allowed in src/.\n");
  for (const violation of darkClassViolations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.token}`);
    console.error(`  ${violation.lineText}`);
  }
  process.exit(1);
}

console.log(
  `Theme contract check passed (${themeFiles.length} themes, ${requiredTokens.size} required tokens, no dark: variants).`,
);
