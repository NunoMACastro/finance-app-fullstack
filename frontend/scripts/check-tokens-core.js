import path from "node:path";

const INCLUDED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

export function shouldCheckTokenFile(filePath, options) {
  const { themesDir, excludedFiles = new Set() } = options;
  if (!INCLUDED_EXTENSIONS.has(path.extname(filePath))) return false;
  if (excludedFiles.has(filePath)) return false;
  if (filePath.startsWith(themesDir + path.sep)) return false;
  return true;
}
