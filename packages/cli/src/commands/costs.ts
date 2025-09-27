import { Command } from "commander";
import chalk from "chalk";
import { dataService } from "../services/data.js";
import { costService } from "../services/cost.js";
import { formatService } from "../services/format.js";

interface CostsOptions {
  days?: number;
  provider?: string;
  alert?: number;
  format?: "text" | "json";
}

export const costsCommand = new Command("costs")
  .description("Cost analysis and spending tracking")
  .option("-d, --days <number>", "Show costs for last N days", parseInt, 7)
  .option("-p, --provider <provider>", "Filter by provider")
  .option(
    "-a, --alert <amount>",
    "Alert if daily cost exceeds amount (in dollars)",
    parseFloat,
  )
  .option("-f, --format <format>", "Output format (text, json)", "text")
  .action(async (options: CostsOptions) => {
    try {
      const sessions = await dataService.loadSessions({
        days: options.days,
        provider: options.provider,
        quiet: true,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(
          formatService.renderWarning(
            "No sessions found for the specified period",
          ),
        );
        return;
      }

      // Calculate costs
      const costSummary = await costService.aggregateCosts(sessions);
      const dailyCosts = costService.getDailyCosts(sessions);
      const providerBreakdown = costService.getProviderBreakdown(costSummary);

      // Check for alerts
      if (options.alert && dailyCosts.length > 0) {
        const alertThresholdCents = options.alert * 100;
        const daysOverLimit = dailyCosts.filter(
          (d) => d.costCents > alertThresholdCents,
        );

        if (daysOverLimit.length > 0) {
          console.log(
            formatService.renderWarning(
              `⚠️  ALERT: ${daysOverLimit.length} day(s) exceeded $${options.alert} spending limit!`,
            ),
          );
          daysOverLimit.forEach((day) => {
            console.log(
              chalk.yellow(
                `   ${day.date}: ${formatService.formatCurrency(day.costCents)} (${formatService.formatPercentage((day.costCents / alertThresholdCents - 1) * 100, 0)} over)`,
              ),
            );
          });
          console.log();
        }
      }

      // JSON output
      if (options.format === "json") {
        console.log(
          JSON.stringify(
            {
              period: {
                days: options.days || 7,
                startDate: dailyCosts[dailyCosts.length - 1]?.date,
                endDate: dailyCosts[0]?.date,
              },
              totalCost: costService.formatCostInDollars(
                costSummary.totalCostCents,
              ),
              dailyAverage: costService.formatCostInDollars(
                costSummary.totalCostCents / Math.max(dailyCosts.length, 1),
              ),
              providers: providerBreakdown.map((p) => ({
                name: p.provider,
                cost: costService.formatCostInDollars(p.costCents),
                percentage: p.percentage,
              })),
              dailyCosts: dailyCosts.map((d) => ({
                date: d.date,
                cost: costService.formatCostInDollars(d.costCents),
                sessions: d.sessions,
              })),
            },
            null,
            2,
          ),
        );
        return;
      }

      // Text output
      const periodDays = options.days || 7;
      const title = options.provider
        ? `💰 ${options.provider} Costs (${periodDays} days)`
        : `💰 Cost Analysis (${periodDays} days)`;

      console.log(formatService.renderHeader(title));

      // Period summary
      const totalDays = Math.min(dailyCosts.length, periodDays);
      const averageDailyCost =
        costSummary.totalCostCents / Math.max(totalDays, 1);
      const projectedMonthlyCost = averageDailyCost * 30;

      const summaryData: Array<[string, any]> = [
        [
          "Period",
          `${dailyCosts[Math.min(totalDays - 1, dailyCosts.length - 1)]?.date || "N/A"} to ${dailyCosts[0]?.date || "today"}`,
        ],
        [
          "Total Cost",
          formatService.formatCurrency(costSummary.totalCostCents),
        ],
        ["Sessions", formatService.formatNumber(sessions.length)],
        ["Daily Average", formatService.formatCurrency(averageDailyCost)],
        [
          "Projected Monthly",
          formatService.formatCurrency(projectedMonthlyCost),
        ],
      ];

      console.log(
        formatService.renderSection(
          "Summary",
          formatService.renderKeyValue(summaryData),
        ),
      );
      console.log();

      // Daily breakdown
      if (dailyCosts.length > 0) {
        const dailyTable = formatService.renderTable({
          head: ["Date", "Sessions", "Cost", "Tokens", "Avg/Session"],
          rows: dailyCosts
            .slice(0, periodDays)
            .map((d) => [
              d.date,
              formatService.formatNumber(d.sessions),
              formatService.formatCurrency(d.costCents),
              formatService.formatNumber(d.tokens),
              formatService.formatCurrency(
                d.sessions > 0 ? d.costCents / d.sessions : 0,
              ),
            ]),
        });

        console.log(formatService.renderSection("Daily Costs", dailyTable));
        console.log();
      }

      // Provider breakdown if multiple providers
      if (providerBreakdown.length > 1) {
        const providerTable = formatService.renderTable({
          head: ["Provider", "Cost", "Sessions", "%"],
          rows: providerBreakdown.map((p) => [
            p.provider,
            formatService.formatCurrency(p.costCents),
            formatService.formatNumber(p.sessions),
            formatService.formatPercentage(p.percentage),
          ]),
        });

        console.log(formatService.renderSection("By Provider", providerTable));
        console.log();
      }

      // Cost trends
      if (dailyCosts.length >= 3) {
        const recentCosts =
          dailyCosts.slice(0, 3).reduce((sum, d) => sum + d.costCents, 0) / 3;
        const previousCosts =
          dailyCosts.slice(3, 6).reduce((sum, d) => sum + d.costCents, 0) /
          Math.min(dailyCosts.length - 3, 3);

        if (previousCosts > 0) {
          const change = ((recentCosts - previousCosts) / previousCosts) * 100;
          const trend = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
          const trendText =
            change > 0
              ? chalk.red(
                  `+${formatService.formatPercentage(Math.abs(change), 0)}`,
                )
              : change < 0
                ? chalk.green(
                    `-${formatService.formatPercentage(Math.abs(change), 0)}`,
                  )
                : "No change";

          console.log(
            formatService.renderSection(
              "Trend",
              `${trend} ${trendText} vs previous period`,
            ),
          );
          console.log();
        }
      }

      // Cost insights
      const insights = costService.getCostInsights(costSummary);
      if (insights.length > 0) {
        console.log(
          formatService.renderSection(
            "💡 Insights",
            formatService.renderList(insights),
          ),
        );
      }
    } catch (error) {
      console.error(formatService.renderError("Failed to analyze costs"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Add "today" subcommand as a shortcut
costsCommand
  .command("today")
  .description("Show today's costs")
  .action(async () => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    try {
      const sessions = await dataService.loadSessions({
        days: 1,
        quiet: true,
        cache: true,
      });

      const todaysSessions = sessions.filter(
        (s) => new Date(s.time.created) >= startOfDay,
      );

      if (todaysSessions.length === 0) {
        console.log(formatService.renderInfo("No sessions today"));
        return;
      }

      const costSummary = await costService.aggregateCosts(todaysSessions);

      console.log(formatService.renderHeader("💰 Today's Costs"));

      const data: Array<[string, any]> = [
        ["Date", formatService.formatDate(today)],
        ["Sessions", formatService.formatNumber(todaysSessions.length)],
        [
          "Total Cost",
          formatService.formatCurrency(costSummary.totalCostCents),
        ],
        ["Total Tokens", formatService.formatNumber(costSummary.totalTokens)],
        [
          "Average/Session",
          formatService.formatCurrency(costSummary.averageCostPerSession),
        ],
      ];

      console.log(formatService.renderKeyValue(data));

      // Provider breakdown if multiple
      const providers = costService.getProviderBreakdown(costSummary);
      if (providers.length > 1) {
        console.log();
        console.log(chalk.cyan("By Provider:"));
        providers.forEach((p) => {
          console.log(
            `  ${p.provider}: ${formatService.formatCurrency(p.costCents)} (${formatService.formatPercentage(p.percentage, 0)})`,
          );
        });
      }
    } catch (error) {
      console.error(formatService.renderError("Failed to get today's costs"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
