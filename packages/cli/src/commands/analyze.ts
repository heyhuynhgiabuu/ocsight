import { Command } from "commander";
import { AnalyzeOptions } from "../types/index.js";
import { loadAllData } from "../lib/data.js";
import { filterSessions, calculateStatistics } from "../lib/analysis.js";
import { formatAnalyzeOutput } from "../lib/output.js";
import { formatMultiSessionSummary } from "../lib/token-display.js";
import { calculateSessionMetrics } from "../lib/cost.js";

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
  .option("--token-details", "Show detailed token cost breakdown")
  .option("--minimal-tokens", "Show minimal token summary only")
  .action(async (options: AnalyzeOptions) => {
    console.log("Loading OpenCode data...");

    try {
      const quickOptions = options.quick
        ? {
            cache: true,
            // Remove all limits - load all sessions like live monitoring
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
      const statistics = await calculateStatistics(filteredSessions);

      // Show token breakdown if requested
      if (options.tokenDetails || options.minimalTokens) {
        console.log("Calculating detailed token costs...");

        const MAX_SESSIONS_FOR_BREAKDOWN = 10;
        const TOKEN_DISTRIBUTION = {
          INPUT_RATIO: 0.7,
          OUTPUT_RATIO: 0.2,
          REASONING_RATIO: 0.05,
          CACHE_WRITE_RATIO: 0.03,
          CACHE_READ_RATIO: 0.02,
        };

        // Convert sessions to metrics for token breakdown
        const sessionMetrics = await Promise.all(
          filteredSessions
            .slice(0, MAX_SESSIONS_FOR_BREAKDOWN)
            .map(async (session) => {
              const sessionData = {
                tokens: {
                  input: Math.floor(
                    session.tokens_used * TOKEN_DISTRIBUTION.INPUT_RATIO,
                  ),
                  output: Math.floor(
                    session.tokens_used * TOKEN_DISTRIBUTION.OUTPUT_RATIO,
                  ),
                  reasoning: Math.floor(
                    session.tokens_used * TOKEN_DISTRIBUTION.REASONING_RATIO,
                  ),
                  cache: {
                    write: Math.floor(
                      session.tokens_used *
                        TOKEN_DISTRIBUTION.CACHE_WRITE_RATIO,
                    ),
                    read: Math.floor(
                      session.tokens_used * TOKEN_DISTRIBUTION.CACHE_READ_RATIO,
                    ),
                  },
                },
                modelID: `${session.model.provider}/${session.model.model}`,
                cost_cents: session.cost_cents,
              };

              return await calculateSessionMetrics(sessionData);
            }),
        );

        const displayLevel = options.minimalTokens
          ? "minimal"
          : options.tokenDetails
            ? "detailed"
            : "smart";

        console.log(formatMultiSessionSummary(sessionMetrics, displayLevel));
      }

      console.log(formatAnalyzeOutput(statistics));
    } catch (error) {
      console.error("Failed to analyze data");
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
