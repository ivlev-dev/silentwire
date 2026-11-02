import { defineConfig } from "vite";
import { asyncDiPlugin } from "../../src/plugin.ts";

export default defineConfig({
  root: process.cwd(),
  plugins: [asyncDiPlugin()],
  build: {
    rollupOptions: {
      treeshake: false,
    },
  },
});
