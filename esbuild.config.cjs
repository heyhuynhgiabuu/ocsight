const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist-bundle/index.js",
    external: [],
    minify: false,
    sourcemap: false,
    target: "node18",
  })
  .catch(() => process.exit(1));
