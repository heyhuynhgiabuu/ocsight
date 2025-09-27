import { Command } from "commander";
import chalk from "chalk";
import { dataService } from "../services/data.js";
import { costService } from "../services/cost.js";
import { formatService } from "../services/format.js";

interface SummaryOptions {
  detailed?: boolean;
  provider?: string;
  days?: number;
  start?: string;
  end?: string;
  format?: "text" | "json";
  quiet?: boolean;
}

export const summaryCommand = new Command("summary")
  .description("Unified usage summary and analysis")
  .option("--detailed", "Show detailed analysis")
  .option(
    "-p, --provider <provider>",
    "Filter by provider (anthropic, openai, etc.)",
  )
  .option("-d, --days <number>", "Filter to last N days", parseInt)
  .option("--start <date>", "Start date (YYYY-MM-DD)")
  .option("--end <date>", "End date (YYYY-MM-DD)")
  .option("-f, --format <format>", "Output format (text, json)", "text")
  .option("-q, --quiet", "Minimal output")
  .action(async (options: SummaryOptions) => {
    try {
      // Load and filter sessions
      const sessions = await dataService.loadSessions({
        days: options.days,
        provider: options.provider,
        quiet: options.quiet,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(
          formatService.renderWarning(
            "No sessions found with the specified filters",
          ),
        );
        return;
      }

      // Calculate costs and aggregates
      const costSummary = await costService.aggregateCosts(sessions);
      const dailyCosts = costService.getDailyCosts(sessions);
      const providerBreakdown = costService.getProviderBreakdown(costSummary);

      // JSON output
      if (options.format === "json") {
        console.log(
          JSON.stringify(
            {
              overview: {
                sessions: sessions.length,
                messages: sessions.reduce(
                  (sum, s) => sum + s.messages.length,
                  0,
                ),
                totalCost: costService.formatCostInDollars(
                  costSummary.totalCostCents,
                ),
                totalTokens: costSummary.totalTokens,
              },
              providers: providerBreakdown,
              dailyActivity: dailyCosts.slice(0, 7),
              insights: costService.getCostInsights(costSummary),
            },
            null,
            2,
          ),
        );
        return;
      }

      // Text output
      console.log(formatService.renderHeader("📊 Usage Summary"));

      // Overview
      const overviewData: Array<[string, any]> = [
        ["Sessions", formatService.formatNumber(sessions.length)],
        [
          "Messages",
          formatService.formatNumber(
            sessions.reduce((sum, s) => sum + s.messages.length, 0),
          ),
        ],
        [
          "Total Cost",
          formatService.formatCurrency(costSummary.totalCostCents),
        ],
        ["Total Tokens", formatService.formatNumber(costSummary.totalTokens)],
      ];

      if (!options.quiet) {
        overviewData.push(
          [
            "Avg Cost/Session",
            formatService.formatCurrency(costSummary.averageCostPerSession),
          ],
          [
            "Avg Tokens/Session",
            formatService.formatNumber(
              Math.round(costSummary.averageTokensPerSession),
            ),
          ],
        );
      }

      console.log(
        formatService.renderSection(
          "Overview",
          formatService.renderKeyValue(overviewData),
        ),
      );
      console.log();

      // Provider breakdown
      if (providerBreakdown.length > 0) {
        const providerTable = formatService.renderTable({
          head: ["Provider", "Sessions", "Cost", "Tokens", "%"],
          rows: providerBreakdown.map((p) => [
            p.provider,
            formatService.formatNumber(p.sessions),
            formatService.formatCurrency(p.costCents),
            formatService.formatNumber(p.tokens),
            formatService.formatPercentage(p.percentage),
          ]),
          totals: [
            chalk.bold("TOTAL"),
            formatService.formatNumber(sessions.length),
            formatService.formatCurrency(costSummary.totalCostCents),
            formatService.formatNumber(costSummary.totalTokens),
            "100.0%",
          ],
        });

        console.log(
          formatService.renderSection("Provider Breakdown", providerTable),
        );
        console.log();
      }

      // Recent activity (last 7 days)
      if (!options.quiet && dailyCosts.length > 0) {
        const recentActivity = dailyCosts.slice(0, 7);
        const activityTable = formatService.renderTable({
          head: ["Date", "Sessions", "Cost", "Tokens"],
          rows: recentActivity.map((d) => [
            d.date,
            formatService.formatNumber(d.sessions),
            formatService.formatCurrency(d.costCents),
            formatService.formatNumber(d.tokens),
          ]),
        });

        console.log(
          formatService.renderSection("Recent Activity", activityTable),
        );
        console.log();
      }

      // Cost insights
      const insights = costService.getCostInsights(costSummary);
      if (insights.length > 0 && !options.quiet) {
        console.log(
          formatService.renderSection(
            "💡 Cost Insights",
            formatService.renderList(insights),
          ),
        );
        console.log();
      }

      // Detailed analysis if requested
      if (options.detailed) {
        // Top 5 expensive sessions
        const topSessions = dataService.getTopSessionsByCost(sessions, 5);
        if (topSessions.length > 0) {
          const topSessionsTable = formatService.renderTable({
            head: ["Session ID", "Cost", "Tokens", "Provider"],
            rows: topSessions.map((s) => [
              s.id.substring(0, 12),
              formatService.formatCurrency(s.cost_cents),
              formatService.formatNumber(s.tokens_used || 0),
              s.model.provider,
            ]),
          });

          console.log(
            formatService.renderSection(
              "Top Expensive Sessions",
              topSessionsTable,
            ),
          );
          console.log();
        }

        // Extended daily activity (30 days)
        if (dailyCosts.length > 7) {
          const extendedActivity = dailyCosts.slice(0, 30);
          const totalPeriodCost = extendedActivity.reduce(
            (sum, d) => sum + d.costCents,
            0,
          );
          const avgDailyCost = totalPeriodCost / extendedActivity.length;

          console.log(
            formatService.renderSection(
              "30-Day Summary",
              formatService.renderKeyValue([
                [
                  "Period",
                  `${extendedActivity[extendedActivity.length - 1].date} to ${extendedActivity[0].date}`,
                ],
                ["Total Cost", formatService.formatCurrency(totalPeriodCost)],
                [
                  "Average Daily Cost",
                  formatService.formatCurrency(avgDailyCost),
                ],
                ["Peak Day", extendedActivity[0].date],
              ]),
            ),
          );
        }
      }
    } catch (error) {
      console.error(formatService.renderError("Failed to generate summary"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
