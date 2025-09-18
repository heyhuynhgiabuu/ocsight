#!/usr/bin/env node
import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";
import { statsCommand } from "./commands/stats.js";
import { exportCommand } from "./commands/export.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Declare the injected version variable for bundled builds
declare const __PACKAGE_VERSION__: string;

// Get version from multiple sources in order of preference
let version = "0.7.4"; // fallback
try {
  // 1. Try injected version (for bundled version)
  if (typeof __PACKAGE_VERSION__ !== "undefined") {
    version = __PACKAGE_VERSION__;
  } else {
    // 2. Try reading from installed package (for ESM/npm)
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(moduleDir, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    version = packageJson.version;
  }
} catch {
  // Keep the fallback version
}

const program = new Command();

program
  .name("ocsight")
  .description(
    "OpenCode ecosystem observability platform - see everything happening in your OpenCode development",
  )
  .version(version);

// Add all commands
program.addCommand(analyzeCommand);
program.addCommand(statsCommand);
program.addCommand(exportCommand);

// Parse command line arguments only when not in test environment
if (!process.env.NODE_ENV || process.env.NODE_ENV !== "test") {
  program.parse();
}

// Export for testing
export { program };
