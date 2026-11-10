import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { feedbackPlugin } from "./feedback-server";

export default defineConfig({
  // feedbackPlugin: the in-app Feedback button saves notes and screenshots into ./feedback.
  plugins: [react(), feedbackPlugin()],
  server: { port: 5173, strictPort: true },
  // Four rule sets' data ship in the main bundle (~150 kB gzipped); PDF code is split out.
  build: { chunkSizeWarningLimit: 800 },
});
