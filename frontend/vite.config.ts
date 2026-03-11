import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

function packageNameFromId(id: string): string | null {
  const nodeModulesIndex = id.lastIndexOf("node_modules/");
  if (nodeModulesIndex === -1) return null;

  const packagePath = id.slice(nodeModulesIndex + "node_modules/".length);
  const segments = packagePath.split("/");
  if (segments.length === 0) return null;

  if (segments[0]?.startsWith("@") && segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0] ?? null;
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const packageName = packageNameFromId(id);
          if (!packageName) {
            return undefined;
          }

          if (packageName === "recharts") {
            return "charts-vendor";
          }
          if (
            packageName === "lucide-react" ||
            packageName === "motion" ||
            packageName === "sonner"
          ) {
            return "ui-vendor";
          }
          if (
            packageName === "react" ||
            packageName === "react-dom" ||
            packageName === "scheduler" ||
            packageName === "use-sync-external-store"
          ) {
            return "react-vendor";
          }
          if (packageName.startsWith("@radix-ui/")) {
            return "radix-vendor";
          }
          if (packageName.startsWith("@mui/")) {
            return "mui-vendor";
          }
          if (packageName.startsWith("@emotion/")) {
            return "emotion-vendor";
          }
          if (packageName) {
            return "vendor";
          }

          return undefined;
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
