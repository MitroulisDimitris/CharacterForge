import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // Four rule sets' data ship in the main bundle (~150 kB gzipped); PDF code is split out.
  build: { chunkSizeWarningLimit: 800 },
});
