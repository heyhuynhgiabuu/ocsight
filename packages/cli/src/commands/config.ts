import { Command } from "commander";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { homedir } from "os";
import chalk from "chalk";
import { bootstrap } from "../lib/bootstrap.js";
import { renderKV, section } from "../lib/table.js";
import { statusIndicator } from "../lib/ui.js";

export const configCommand = new Command("config")
  .description("Manage ocsight configuration");

configCommand
  .command("show")
  .description("Show current configuration")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config);
      const config = ctx.config;
      
      console.log(chalk.bold.blue("\n📋 ocsight Configuration\n"));
      
      // Paths section
      const pathsTable = renderKV([
        ["Data directory", config.paths.data_dir],
        ["Export directory", config.paths.export_dir],
        ["Cache directory", config.paths.cache_dir]
      ]);
      console.log(section("📁 Paths:", pathsTable));
      
      // UI section
      const uiTable = renderKV([
        ["Table style", config.ui.table_style],
        ["Colors enabled", config.ui.colors ? "Yes" : "No"],
        ["Progress bars", config.ui.progress_bars ? "Yes" : "No"],
        ["Live refresh interval", `${config.ui.live_refresh_interval}s`]
      ]);
      console.log(section("🎨 UI Settings:", uiTable));
      
      // Export section
      const exportTable = renderKV([
        ["Default format", config.export.default_format],
        ["Include metadata", config.export.include_metadata ? "Yes" : "No"],
        ["Include raw data", config.export.include_raw_data ? "Yes" : "No"]
      ]);
      console.log(section("📤 Export Settings:", exportTable));
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to load configuration"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });

configCommand
  .command("init")
  .description("Initialize default configuration file")
  .option("--global", "Create global config (~/.config/ocsight/config.json)")
  .action(async (options) => {
    try {
      const defaultConfig = {
        ui: {
          table_style: "rich",
          colors: true,
          progress_bars: true,
          live_refresh_interval: 5
        },
        export: {
          default_format: "csv",
          include_metadata: true,
          include_raw_data: false
        },
        paths: {
          data_dir: "~/.local/share/opencode/storage/message",
          export_dir: "./exports",
          cache_dir: "~/.cache/ocsight"
        }
      };
      
      const configPath = options.global
        ? join(homedir(), ".config", "ocsight", "config.json")
        : join(process.cwd(), "ocsight.config.json");
      
      // Create directory if it doesn't exist
      await mkdir(dirname(configPath), { recursive: true });
      
      // Write config file
      await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
      
      console.log(statusIndicator("success", `Configuration file created at ${configPath}`));
      console.log(chalk.dim(`\nEdit the file to customize your settings, then run:`));
      console.log(chalk.cyan(`  ocsight config show`));
      
    } catch (error) {
      console.error(statusIndicator("error", "Failed to create configuration file"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });

configCommand
  .command("doctor")
  .description("Validate configuration and data paths")
  .option("--config <path>", "Path to config file")
  .action(async (options) => {
    try {
      const ctx = await bootstrap(options.config);
      const config = ctx.config;
      
      console.log(chalk.bold.blue("\n🔍 Configuration Health Check\n"));
      
      // Check data directory
      try {
        const { stat } = await import("fs/promises");
        await stat(config.paths.data_dir);
        console.log(statusIndicator("success", `Data directory exists: ${config.paths.data_dir}`));
      } catch {
        console.log(statusIndicator("warning", `Data directory not found: ${config.paths.data_dir}`));
      }
      
      // Check export directory
      try {
        await mkdir(config.paths.export_dir, { recursive: true });
        console.log(statusIndicator("success", `Export directory ready: ${config.paths.export_dir}`));
      } catch {
        console.log(statusIndicator("error", `Cannot create export directory: ${config.paths.export_dir}`));
      }
      
      // Check cache directory
      try {
        await mkdir(config.paths.cache_dir, { recursive: true });
        console.log(statusIndicator("success", `Cache directory ready: ${config.paths.cache_dir}`));
      } catch {
        console.log(statusIndicator("warning", `Cannot create cache directory: ${config.paths.cache_dir}`));
      }
      
      // Validate settings
      const refreshInterval = config.ui.live_refresh_interval;
      if (refreshInterval < 1 || refreshInterval > 60) {
        console.log(statusIndicator("warning", `Live refresh interval should be 1-60 seconds (current: ${refreshInterval})`));
      } else {
        console.log(statusIndicator("success", `Live refresh interval is valid: ${refreshInterval}s`));
      }
      
      console.log(statusIndicator("info", "\nConfiguration validation complete"));
      
    } catch (error) {
      console.error(statusIndicator("error", "Configuration validation failed"));
      console.error(chalk.red(error instanceof Error ? error.message : "Unknown error"));
      process.exit(1);
    }
  });