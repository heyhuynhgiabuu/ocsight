#!/usr/bin/env node
import { Command } from "commander";
import { summaryCommand } from "./commands/summary.js";
import { sessionsCommand } from "./commands/sessions.js";
import { costsCommand } from "./commands/costs.js";
import { exportCommand } from "./commands/export.js";
import { configCommand } from "./commands/config.js";
import { liveCommand } from "./commands/live.js";
import { modelsCommand } from "./commands/models.js";
import { budgetCommand } from "./commands/budget.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

// Declare the injected version variable for bundled builds
declare const __PACKAGE_VERSION__: string;

// Get version from multiple sources in order of preference
const getVersion = async (): Promise<string> => {
  // 1. Try injected version (for bundled version)
  if (typeof __PACKAGE_VERSION__ !== "undefined") {
    return __PACKAGE_VERSION__;
  }

  // 2. Try reading from installed package (for ESM/npm)
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(moduleDir, "..", "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch {
    // Keep the fallback version
    return "0.7.4";
  }
};

const initializeProgram = async (): Promise<Command> => {
  const program = new Command();
  const version = await getVersion();

  program
    .name("ocsight")
    .description(
      "OpenCode ecosystem observability platform - see everything happening in your OpenCode development",
    )
    .version(version);

  // Add all commands
  program.addCommand(summaryCommand);
  program.addCommand(sessionsCommand);
  program.addCommand(costsCommand);
  program.addCommand(exportCommand);
  program.addCommand(configCommand);
  program.addCommand(liveCommand);
  program.addCommand(modelsCommand);
  program.addCommand(budgetCommand);

  return program;
};

// Parse command line arguments only when not in test environment
if (!process.env.NODE_ENV || process.env.NODE_ENV !== "test") {
  initializeProgram().then((program) => program.parse());
}

// Export for testing
export { initializeProgram };
