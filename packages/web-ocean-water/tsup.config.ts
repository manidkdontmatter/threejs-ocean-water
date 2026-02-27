import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/lib/index.ts",
    math: "src/lib/math.ts",
    sky: "src/lib/sky.ts",
    rapier: "src/lib/rapier.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["three", "@dimforge/rapier3d-compat"],
  treeshake: true
});
