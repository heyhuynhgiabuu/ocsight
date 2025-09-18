import { Command } from "commander";
import { AnalyzeOptions } from "../types/index.js";
import { loadAllData } from "../lib/data.js";
import { filterSessions, calculateStatistics } from "../lib/analysis.js";
import { formatAnalyzeOutput } from "../lib/output.js";

export const analyzeCommand = new Command("analyze")
  .description("Analyze OpenCode usage data")
  .option("--quick", "Quick analysis mode with recent data only")
  .option("-d, --days <number>", "Filter to last N days", parseInt)
  .option("--start <date>", "Start date (YYYY-MM-DD)")
  .option("--end <date>", "End date (YYYY-MM-DD)")
  .option(
    "--provider <provider>",
    "Filter by provider (anthropic, openai, etc.)",
  )
  .option("--project <project>", "Filter by project name")
  .option("--exclude-project <project>", "Exclude project name")
  .option("--verbose", "Show detailed progress information")
  .option("--quiet", "Suppress progress output")
  .action(async (options: AnalyzeOptions) => {
    console.log("Loading OpenCode data...");

    try {
      // Quick mode: limit to recent 30 days, 1000 messages max
      const quickOptions = options.quick
        ? {
            limit: 1000,
            cache: true,
            // Add time filtering for recent data
            days: options.days || 30,
            verbose: options.verbose,
            quiet: options.quiet,
          }
        : {
            verbose: options.verbose,
            quiet: options.quiet,
          };

      const data = await loadAllData(quickOptions);
      console.log(
        `Analyzing usage data${options.quick ? " (quick mode)" : ""}...`,
      );

      const filteredSessions = filterSessions(data, options);
      const statistics = calculateStatistics(filteredSessions);

      console.log(formatAnalyzeOutput(statistics));
    } catch (error) {
      console.error("Failed to analyze data");
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
