import chalk from "chalk";
import { renderTable, renderKV, section } from "./table.js";
import { UsageStatistics } from "../types/index.js";
import { formatCostInDollars, formatNumber, getTopTools } from "./analysis.js";

export function formatAnalyzeOutput(stats: UsageStatistics): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold("\nOpenCode Usage Analysis\n"));

  // Overview
  const overviewTable = renderKV([
    ["Sessions", formatNumber(stats.totalSessions)],
    ["Messages", formatNumber(stats.totalMessages)],
    ["Tools used", formatNumber(stats.totalTools)],
    ["Total cost", formatCostInDollars(stats.totalCostCents)],
    ["Total tokens", formatNumber(stats.totalTokens)],
  ]);
  lines.push(section("Overview:", overviewTable));

  // Cost optimization insights
  if (stats.costOptimization) {
    const costOpt = stats.costOptimization;
    const costTable = renderKV([
      [
        "Average cost per session",
        formatCostInDollars(costOpt.averageCostPerSession),
      ],
      [
        "Average tokens per session",
        formatNumber(Math.round(costOpt.averageTokensPerSession)),
      ],
      ["Most expensive provider", costOpt.mostExpensiveProvider || "N/A"],
      ["Most expensive model", costOpt.mostExpensiveModel || "N/A"],
      [
        "Top expensive sessions",
        `${costOpt.expensiveSessions.length} identified`,
      ],
    ]);
    lines.push(section("Cost Optimization Insights:", costTable));

    if (costOpt.costSavingSuggestions.length > 0) {
      lines.push(chalk.yellow("Cost saving suggestions:"));
      costOpt.costSavingSuggestions.forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
      lines.push("");
    }
  }

  // Tool efficiency metrics
  if (stats.toolEfficiency) {
    const toolEff = stats.toolEfficiency;

    if (toolEff.mostUsedTools.length > 0) {
      const toolRows = toolEff.mostUsedTools
        .slice(0, 5)
        .map(({ name, count }) => {
          const successRate = toolEff.toolSuccessRates[name] || 0;
          const avgDuration = toolEff.averageToolDuration[name] || 0;
          return [
            name,
            count,
            `${(successRate * 100).toFixed(0)}%`,
            `${avgDuration}ms`,
          ];
        });

      const toolTable = renderTable({
        head: ["Tool", "Uses", "Success%", "Avg ms"],
        rows: toolRows,
      });
      lines.push(section("Tool Efficiency Metrics:", toolTable));
    }
  }

  // Time patterns
  if (stats.timePatterns) {
    const timePat = stats.timePatterns;

    if (timePat.peakHours.length > 0) {
      const hourRows = timePat.peakHours.map(({ hour, count }) => [
        `${hour.toString().padStart(2, "0")}:00`,
        count,
      ]);
      const hoursTable = renderTable({
        head: ["Hour", "Sessions"],
        rows: hourRows,
      });
      lines.push(section("Peak Hours:", hoursTable));
    }

    if (timePat.peakDays.length > 0) {
      const dayRows = timePat.peakDays.map(({ day, count }) => [day, count]);
      const daysTable = renderTable({
        head: ["Day", "Sessions"],
        rows: dayRows,
      });
      lines.push(section("Peak Days:", daysTable));
    }
  }

  // Project analysis
  if (stats.projectAnalysis) {
    const projectAnalysis = stats.projectAnalysis;

    if (projectAnalysis.detectedProjects.length > 0) {
      const projectRows = projectAnalysis.detectedProjects
        .slice(0, 5)
        .map((project) => [
          project.name,
          project.sessionCount,
          formatCostInDollars(project.totalCost),
        ]);
      const projectsTable = renderTable({
        head: ["Project", "Sessions", "Total Cost"],
        rows: projectRows,
      });
      lines.push(section("Project Analysis:", projectsTable));
    }

    if (projectAnalysis.crossProjectComparison.mostActiveProject) {
      const insightsTable = renderKV([
        [
          "Most active",
          projectAnalysis.crossProjectComparison.mostActiveProject,
        ],
        [
          "Most expensive",
          projectAnalysis.crossProjectComparison.mostExpensiveProject,
        ],
        [
          "Most tool-intensive",
          projectAnalysis.crossProjectComparison.mostToolIntensiveProject,
        ],
      ]);
      lines.push(section("Cross-project Insights:", insightsTable));
    }
  }

  // Provider breakdown with totals
  const providerRows = Object.entries(stats.sessionsByProvider)
    .sort(([, a], [, b]) => b - a)
    .map(([provider, sessions]) => {
      const cost = stats.costsByProvider[provider] || 0;
      const tokens = stats.tokensByProvider[provider] || 0;
      return [
        provider,
        sessions,
        formatCostInDollars(cost),
        formatNumber(tokens),
      ];
    });

  const providerTotals = [
    "TOTALS",
    stats.totalSessions,
    formatCostInDollars(stats.totalCostCents),
    formatNumber(stats.totalTokens),
  ];

  const providerTable = renderTable({
    head: ["Provider", "Sessions", "Cost", "Tokens"],
    rows: providerRows,
    totals: providerTotals,
    summary: [
      [
        "Average per session",
        stats.totalSessions > 0
          ? `$${(stats.totalCostCents / 100 / stats.totalSessions).toFixed(4)}`
          : "$0.00",
      ],
      ["Providers used", Object.keys(stats.sessionsByProvider).length],
    ],
  });
  lines.push(section("By Provider:", providerTable));

  // Top tools
  const topTools = getTopTools(stats.toolUsage, 10);
  if (topTools.length > 0) {
    const toolRows = topTools.map(({ name, count }) => [
      name,
      formatNumber(count),
    ]);
    const toolsTable = renderTable({
      head: ["Tool", "Uses"],
      rows: toolRows,
    });
    lines.push(section("Top Tools:", toolsTable));
  }

  // Recent activity (last 7 days)
  const recentDays = Object.entries(stats.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);

  if (recentDays.length > 0) {
    const activityRows = recentDays.map(([date, dayStats]) => [
      date,
      dayStats.sessions,
      formatCostInDollars(dayStats.cost),
    ]);
    const activityTable = renderTable({
      head: ["Date", "Sessions", "Cost"],
      rows: activityRows,
    });
    lines.push(section("Recent Activity (Last 7 Days):", activityTable));
  }

  return lines.join("\n");
}

export function formatStatsOutput(stats: UsageStatistics): string {
  const lines: string[] = [];

  lines.push(chalk.bold("\nDetailed Statistics\n"));

  // Sessions by provider
  const sessionRows = Object.entries(stats.sessionsByProvider)
    .sort(([, a], [, b]) => b - a)
    .map(([provider, count]) => {
      const percentage = ((count / stats.totalSessions) * 100).toFixed(1);
      return [provider, count, `${percentage}%`];
    });

  const sessionsTable = renderTable({
    head: ["Provider", "Sessions", "%"],
    rows: sessionRows,
  });
  lines.push(section("Sessions by Provider:", sessionsTable));

  // Cost breakdown
  const costRows = Object.entries(stats.costsByProvider)
    .sort(([, a], [, b]) => b - a)
    .map(([provider, cost]) => {
      const percentage =
        stats.totalCostCents > 0
          ? ((cost / stats.totalCostCents) * 100).toFixed(1)
          : "0.0";
      return [provider, formatCostInDollars(cost), `${percentage}%`];
    });

  const costTable = renderTable({
    head: ["Provider", "Cost", "%"],
    rows: costRows,
  });
  lines.push(section("Cost by Provider:", costTable));

  // Token usage
  const tokenRows = Object.entries(stats.tokensByProvider)
    .sort(([, a], [, b]) => b - a)
    .map(([provider, tokens]) => {
      const percentage =
        stats.totalTokens > 0
          ? ((tokens / stats.totalTokens) * 100).toFixed(1)
          : "0.0";
      return [provider, formatNumber(tokens), `${percentage}%`];
    });

  const tokensTable = renderTable({
    head: ["Provider", "Tokens", "%"],
    rows: tokenRows,
  });
  lines.push(section("Tokens by Provider:", tokensTable));

  // All tools usage
  const allTools = getTopTools(stats.toolUsage, 50);
  const toolUsageRows = allTools.map(({ name, count }) => {
    const percentage =
      stats.totalTools > 0
        ? ((count / stats.totalTools) * 100).toFixed(1)
        : "0.0";
    return [name, count, `${percentage}%`];
  });

  const toolUsageTable = renderTable({
    head: ["Tool", "Uses", "%"],
    rows: toolUsageRows,
  });
  lines.push(section("Tool Usage:", toolUsageTable));

  // Daily activity
  const dailyRows = Object.entries(stats.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .map(([date, dayStats]) => [
      date,
      dayStats.sessions,
      formatCostInDollars(dayStats.cost),
      formatNumber(dayStats.tokens),
    ]);

  const dailyTable = renderTable({
    head: ["Date", "Sessions", "Cost", "Tokens"],
    rows: dailyRows,
  });
  lines.push(section("Daily Activity:", dailyTable));

  return lines.join("\n");
}

const PROGRESS_BAR_WIDTH = 40;

export function formatProgressBar(
  current: number,
  total: number,
  width = PROGRESS_BAR_WIDTH,
): string {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `${bar} ${percentage}%`;
}
