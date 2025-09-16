import { Command } from "commander";
import { AnalyzeOptions } from "../types/index.js";
import { loadAllData } from "../lib/data.js";
import { filterSessions, calculateStatistics } from "../lib/analysis.js";
import { formatStatsOutput } from "../lib/output.js";

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
    console.log("Loading OpenCode data...");

    try {
      const data = await loadAllData({ limit: 3000 }); // Limit for better performance
      console.log("Calculating statistics...");

      const filteredSessions = filterSessions(data, options);
      const statistics = calculateStatistics(filteredSessions);

      console.log(formatStatsOutput(statistics));
    } catch (error) {
      console.error("Failed to generate statistics");
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
