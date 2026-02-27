import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^web-ocean-water$/,
        replacement: path.resolve(__dirname, "../../packages/web-ocean-water/src/lib/index.ts")
      },
      {
        find: /^web-ocean-water\/math$/,
        replacement: path.resolve(__dirname, "../../packages/web-ocean-water/src/lib/math.ts")
      },
      {
        find: /^web-ocean-water\/sky$/,
        replacement: path.resolve(__dirname, "../../packages/web-ocean-water/src/lib/sky.ts")
      },
      {
        find: /^web-ocean-water\/rapier$/,
        replacement: path.resolve(__dirname, "../../packages/web-ocean-water/src/lib/rapier.ts")
      }
    ]
  }
});
