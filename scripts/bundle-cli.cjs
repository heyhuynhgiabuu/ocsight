#!/usr/bin/env node

const { execSync } = require("child_process");
const { readFileSync } = require("fs");
const { join } = require("path");

// Read version from main package.json
const mainPkgPath = join(__dirname, "..", "package.json");
const mainPkg = JSON.parse(readFileSync(mainPkgPath, "utf8"));
const version = mainPkg.version;

console.log(`Bundling CLI with version ${version}...`);

// Run esbuild with version injection for Node runtime (Bun compatible)
const esbuildCmd = `cd ${__dirname}/.. && esbuild packages/cli/src/index.ts --bundle --platform=node --format=cjs --outfile=packages/cli/dist/index.cjs --external:@heyhuynhgiabuu/ocsight-cli --external:bun --external:fs --external:path --external:os --external:crypto --external:url --external:readline --external:node:* --external:glob --target=node18 --define:__PACKAGE_VERSION__='\"${version}\"'`;

try {
  execSync(esbuildCmd, { stdio: "inherit" });
  console.log("CLI bundled successfully!");
} catch (error) {
  console.error("Bundling failed:", error.message);
  process.exit(1);
}
