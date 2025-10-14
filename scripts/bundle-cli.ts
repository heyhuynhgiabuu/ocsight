#!/usr/bin/env bun

import { join } from "path";

const mainPkgPath = join(import.meta.dir, "..", "package.json");
const mainPkg = await Bun.file(mainPkgPath).json();
const version = mainPkg.version;

console.log(`🔨 Bundling CLI with version ${version}...`);

const entrypoint = join(import.meta.dir, "..", "packages/cli/src/index.ts");
const outdir = join(import.meta.dir, "..", "packages/cli/dist");

try {
  // Bundle for Node/Bun runtime
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir,
    target: "bun",
    format: "esm",
    minify: false,
    sourcemap: "external",
    splitting: false,
    define: {
      __PACKAGE_VERSION__: JSON.stringify(version),
    },
    external: [
      "@heyhuynhgiabuu/ocsight-cli",
      "bun",
      "fs",
      "path",
      "os",
      "crypto",
      "url",
      "readline",
      "node:*",
    ],
  });

  if (!result.success) {
    console.error("❌ Build failed:");
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(`✅ CLI bundled successfully!`);
  console.log(`📦 Output: ${outdir}`);
  console.log(`📊 ${result.outputs.length} file(s) generated`);
  
  for (const output of result.outputs) {
    const file = Bun.file(output.path);
    const size = file.size / 1024;
    console.log(`   - ${output.path.split('/').pop()} (${size.toFixed(2)} KB)`);
  }
} catch (error) {
  console.error("❌ Bundling failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
