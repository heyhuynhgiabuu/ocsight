#!/usr/bin/env node
// IMPORTANT: Runtime compatibility polyfill must be imported FIRST
// This polyfills Bun APIs for Node.js runtime when bundled
import "./lib/runtime-compat.js";

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

// Get version - uses injected version from build process
const getVersion = (): string => {
  return typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "0.7.4";
};

const initializeProgram = async (): Promise<Command> => {
  const program = new Command();
  const version = getVersion();

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
