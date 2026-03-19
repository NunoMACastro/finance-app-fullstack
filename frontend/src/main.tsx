import { createRoot } from "react-dom/client";
import App from "./app/App";
import { bootstrapThemePalette } from "./app/lib/theme-palette";
import "./styles/index.css";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  bootstrapThemePalette(window, document);
}

createRoot(document.getElementById("root")!).render(<App />);
