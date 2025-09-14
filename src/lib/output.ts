import chalk from "chalk";
import { UsageStatistics } from "../types";
import { formatCostInDollars, formatNumber, getTopTools } from "./analysis";

export function formatAnalyzeOutput(stats: UsageStatistics): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold("\n📊 OpenCode Usage Analysis\n"));

  // Overview
  lines.push(chalk.cyan("Overview:"));
  lines.push(`  Sessions: ${chalk.white(formatNumber(stats.totalSessions))}`);
  lines.push(`  Messages: ${chalk.white(formatNumber(stats.totalMessages))}`);
  lines.push(`  Tools used: ${chalk.white(formatNumber(stats.totalTools))}`);
  lines.push(
    `  Total cost: ${chalk.green(formatCostInDollars(stats.totalCostCents))}`,
  );
  lines.push(
    `  Total tokens: ${chalk.white(formatNumber(stats.totalTokens))}\n`,
  );

  // Provider breakdown
  lines.push(chalk.cyan("By Provider:"));
  Object.entries(stats.sessionsByProvider)
    .sort(([, a], [, b]) => b - a)
    .forEach(([provider, sessions]) => {
      const cost = stats.costsByProvider[provider] || 0;
      const tokens = stats.tokensByProvider[provider] || 0;
      lines.push(
        `  ${chalk.white(provider)}: ${sessions} sessions, ${formatCostInDollars(cost)}, ${formatNumber(tokens)} tokens`,
      );
    });
  lines.push("");

  // Top tools
  const topTools = getTopTools(stats.toolUsage, 10);
  if (topTools.length > 0) {
    lines.push(chalk.cyan("Top Tools:"));
    topTools.forEach(({ name, count }) => {
      lines.push(`  ${chalk.white(name)}: ${formatNumber(count)} uses`);
    });
    lines.push("");
  }

  // Recent activity (last 7 days)
  const recentDays = Object.entries(stats.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);

  if (recentDays.length > 0) {
    lines.push(chalk.cyan("Recent Activity (Last 7 Days):"));
    recentDays.forEach(([date, dayStats]) => {
      lines.push(
        `  ${chalk.white(date)}: ${dayStats.sessions} sessions, ${formatCostInDollars(dayStats.cost)}`,
      );
    });
    lines.push("");
  }

  return lines.join("\n");
}

export function formatStatsOutput(stats: UsageStatistics): string {
  const lines: string[] = [];

  lines.push(chalk.bold("\n📈 Detailed Statistics\n"));

  // Sessions by provider
  lines.push(chalk.cyan("Sessions by Provider:"));
  Object.entries(stats.sessionsByProvider)
    .sort(([, a], [, b]) => b - a)
    .forEach(([provider, count]) => {
      const percentage = ((count / stats.totalSessions) * 100).toFixed(1);
      lines.push(
        `  ${chalk.white(provider.padEnd(15))}: ${count.toString().padStart(6)} (${percentage}%)`,
      );
    });
  lines.push("");

  // Cost breakdown
  lines.push(chalk.cyan("Cost by Provider:"));
  Object.entries(stats.costsByProvider)
    .sort(([, a], [, b]) => b - a)
    .forEach(([provider, cost]) => {
      const percentage =
        stats.totalCostCents > 0
          ? ((cost / stats.totalCostCents) * 100).toFixed(1)
          : "0.0";
      lines.push(
        `  ${chalk.white(provider.padEnd(15))}: ${formatCostInDollars(cost).padStart(8)} (${percentage}%)`,
      );
    });
  lines.push("");

  // Token usage
  lines.push(chalk.cyan("Tokens by Provider:"));
  Object.entries(stats.tokensByProvider)
    .sort(([, a], [, b]) => b - a)
    .forEach(([provider, tokens]) => {
      const percentage =
        stats.totalTokens > 0
          ? ((tokens / stats.totalTokens) * 100).toFixed(1)
          : "0.0";
      lines.push(
        `  ${chalk.white(provider.padEnd(15))}: ${formatNumber(tokens).padStart(10)} (${percentage}%)`,
      );
    });
  lines.push("");

  // All tools usage
  lines.push(chalk.cyan("Tool Usage:"));
  const allTools = getTopTools(stats.toolUsage, 50);
  allTools.forEach(({ name, count }) => {
    const percentage =
      stats.totalTools > 0
        ? ((count / stats.totalTools) * 100).toFixed(1)
        : "0.0";
    lines.push(
      `  ${chalk.white(name.padEnd(20))}: ${count.toString().padStart(6)} (${percentage}%)`,
    );
  });
  lines.push("");

  // Daily activity
  lines.push(chalk.cyan("Daily Activity:"));
  Object.entries(stats.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .forEach(([date, dayStats]) => {
      lines.push(
        `  ${chalk.white(date)}: ${dayStats.sessions.toString().padStart(3)} sessions, ` +
          `${formatCostInDollars(dayStats.cost).padStart(8)}, ${formatNumber(dayStats.tokens).padStart(8)} tokens`,
      );
    });

  return lines.join("\n");
}

export function formatProgressBar(
  current: number,
  total: number,
  width = 40,
): string {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `${bar} ${percentage}%`;
}
