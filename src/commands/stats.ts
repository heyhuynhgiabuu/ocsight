import { Command } from "commander";
import ora from "ora";
import { AnalyzeOptions } from "../types";
import { loadAllData } from "../lib/data";
import { filterSessions, calculateStatistics } from "../lib/analysis";
import { formatStatsOutput } from "../lib/output";

export const statsCommand = new Command("stats")
  .description("Show detailed statistics about OpenCode usage")
  .option("-d, --days <number>", "Filter to last N days", parseInt)
  .option("--start <date>", "Start date (YYYY-MM-DD)")
  .option("--end <date>", "End date (YYYY-MM-DD)")
  .option(
    "--provider <provider>",
    "Filter by provider (anthropic, openai, etc.)",
  )
  .option("--project <project>", "Filter by project name")
  .option("--exclude-project <project>", "Exclude project name")
  .action(async (options: AnalyzeOptions) => {
    const spinner = ora("Loading OpenCode data...").start();

    try {
      const data = await loadAllData({ limit: 3000 }); // Limit for better performance
      spinner.text = "Calculating statistics...";

      const filteredSessions = filterSessions(data, options);
      const statistics = calculateStatistics(filteredSessions);

      spinner.stop();
      console.log(formatStatsOutput(statistics));
    } catch (error) {
      spinner.fail("Failed to generate statistics");
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
