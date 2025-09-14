#!/usr/bin/env node
import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";
import { statsCommand } from "./commands/stats.js";
import { exportCommand } from "./commands/export.js";

const program = new Command();

program
  .name("ocsight")
  .description(
    "OpenCode ecosystem observability platform - see everything happening in your OpenCode development",
  )
  .version("1.0.0");

// Add all commands
program.addCommand(analyzeCommand);
program.addCommand(statsCommand);
program.addCommand(exportCommand);

// Parse command line arguments
program.parse();
