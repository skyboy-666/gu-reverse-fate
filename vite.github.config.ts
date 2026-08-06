import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "github-pages",
  base: "/gu-reverse-fate/",
  plugins: [react()],
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
