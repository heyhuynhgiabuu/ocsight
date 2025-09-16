import chalk from "chalk";
import { UsageStatistics } from "../types/index.js";
import { formatCostInDollars, formatNumber, getTopTools } from "./analysis.js";

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

  // Cost optimization insights
  if (stats.costOptimization) {
    const costOpt = stats.costOptimization;
    lines.push(chalk.cyan("💰 Cost Optimization Insights:"));
    lines.push(
      `  Average cost per session: ${chalk.yellow(formatCostInDollars(costOpt.averageCostPerSession))}`,
    );
    lines.push(
      `  Average tokens per session: ${chalk.white(formatNumber(Math.round(costOpt.averageTokensPerSession)))}`,
    );
    lines.push(
      `  Most expensive provider: ${chalk.red(costOpt.mostExpensiveProvider || "N/A")}`,
    );
    lines.push(
      `  Most expensive model: ${chalk.red(costOpt.mostExpensiveModel || "N/A")}`,
    );

    if (costOpt.expensiveSessions.length > 0) {
      lines.push(
        `  Top expensive sessions: ${costOpt.expensiveSessions.length} identified`,
      );
    }

    if (costOpt.costSavingSuggestions.length > 0) {
      lines.push(chalk.yellow("  💡 Cost saving suggestions:"));
      costOpt.costSavingSuggestions.forEach((suggestion, index) => {
        lines.push(`    ${index + 1}. ${suggestion}`);
      });
    }
    lines.push("");
  }

  // Tool efficiency metrics
  if (stats.toolEfficiency) {
    const toolEff = stats.toolEfficiency;
    lines.push(chalk.cyan("🔧 Tool Efficiency Metrics:"));

    if (toolEff.mostUsedTools.length > 0) {
      lines.push("  Most used tools:");
      toolEff.mostUsedTools.slice(0, 5).forEach(({ name, count }) => {
        const successRate = toolEff.toolSuccessRates[name] || 0;
        const avgDuration = toolEff.averageToolDuration[name] || 0;
        lines.push(
          `    ${chalk.white(name)}: ${count} uses, ${(successRate * 100).toFixed(0)}% success, ${avgDuration}ms avg`,
        );
      });
    }
    lines.push("");
  }

  // Time patterns
  if (stats.timePatterns) {
    const timePat = stats.timePatterns;
    lines.push(chalk.cyan("⏰ Usage Patterns:"));

    if (timePat.peakHours.length > 0) {
      lines.push("  Peak hours:");
      timePat.peakHours.forEach(({ hour, count }) => {
        lines.push(
          `    ${hour.toString().padStart(2, "0")}:00 - ${count} sessions`,
        );
      });
    }

    if (timePat.peakDays.length > 0) {
      lines.push("  Peak days:");
      timePat.peakDays.forEach(({ day, count }) => {
        lines.push(`    ${chalk.white(day)}: ${count} sessions`);
      });
    }
    lines.push("");
  }

  // Project analysis
  if (stats.projectAnalysis) {
    const projectAnalysis = stats.projectAnalysis;
    lines.push(chalk.cyan("📁 Project Analysis:"));

    if (projectAnalysis.detectedProjects.length > 0) {
      lines.push("  Detected projects:");
      projectAnalysis.detectedProjects.slice(0, 5).forEach((project) => {
        lines.push(
          `    ${chalk.white(project.name)}: ${project.sessionCount} sessions, ${formatCostInDollars(project.totalCost)}`,
        );
      });
    }

    if (projectAnalysis.crossProjectComparison.mostActiveProject) {
      lines.push("  Cross-project insights:");
      lines.push(
        `    Most active: ${chalk.white(projectAnalysis.crossProjectComparison.mostActiveProject)}`,
      );
      lines.push(
        `    Most expensive: ${chalk.red(projectAnalysis.crossProjectComparison.mostExpensiveProject)}`,
      );
      lines.push(
        `    Most tool-intensive: ${chalk.yellow(projectAnalysis.crossProjectComparison.mostToolIntensiveProject)}`,
      );
    }
    lines.push("");
  }

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
