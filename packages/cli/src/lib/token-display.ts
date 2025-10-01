import chalk from "chalk";
import { renderTable, renderKV, section } from "./table.js";
import { createProgressBar, getThresholdColor } from "./ui.js";
import { SessionMetrics, formatCost, formatTokens } from "./cost.js";

export type DisplayLevel = "minimal" | "smart" | "detailed";

export const formatTokenBreakdown = (
  metrics: SessionMetrics,
  level: DisplayLevel = "smart",
): string => {
  const { tokens, cost, cache_hit_rate } = metrics;

  if (level === "minimal") {
    return `${formatTokens(tokens.total)} tokens, ${formatCost(cost.total)}, ${(cache_hit_rate * 100).toFixed(0)}% cache`;
  }

  if (level === "smart") {
    const lines: string[] = [];

    // High-level summary
    const summary: Array<[string, string | number]> = [
      ["Total Tokens", formatTokens(tokens.total)],
      ["Total Cost", formatCost(cost.total)],
      ["Cache Hit Rate", `${(cache_hit_rate * 100).toFixed(1)}%`],
    ];

    // Add significant components only
    if (cost.input > cost.total * 0.05) {
      summary.push(["Input Cost", formatCost(cost.input)]);
    }
    if (cost.cache_read > cost.total * 0.05) {
      summary.push(["Cache Savings", formatCost(cost.cache_read)]);
    }
    if (tokens.reasoning > tokens.total * 0.05) {
      summary.push(["Reasoning Tokens", formatTokens(tokens.reasoning)]);
    }

    const summaryTable = renderKV(summary);
    lines.push(section("💰 Cost Summary:", summaryTable));

    return lines.join("\n");
  }

  // Detailed view
  const lines: string[] = [];

  // Token breakdown table with division by zero protection
  const totalTokens = tokens.total || 1;
  const tokenRows = [
    [
      "Input",
      formatTokens(tokens.input),
      formatCost(cost.input),
      `${((tokens.input / totalTokens) * 100).toFixed(1)}%`,
    ],
    [
      "Output",
      formatTokens(tokens.output),
      formatCost(cost.output),
      `${((tokens.output / totalTokens) * 100).toFixed(1)}%`,
    ],
  ];

  if (tokens.reasoning > 0) {
    tokenRows.push([
      "Reasoning",
      formatTokens(tokens.reasoning),
      formatCost(cost.reasoning),
      `${((tokens.reasoning / totalTokens) * 100).toFixed(1)}%`,
    ]);
  }

  tokenRows.push([
    "Cache Write",
    formatTokens(tokens.cache_write),
    formatCost(cost.cache_write),
    `${((tokens.cache_write / totalTokens) * 100).toFixed(1)}%`,
  ]);

  tokenRows.push([
    "Cache Read",
    formatTokens(tokens.cache_read),
    formatCost(cost.cache_read),
    `${((tokens.cache_read / totalTokens) * 100).toFixed(1)}%`,
  ]);

  const totalsRow = [
    chalk.bold("TOTAL"),
    chalk.bold(formatTokens(tokens.total)),
    chalk.bold(formatCost(cost.total)),
    chalk.bold("100.0%"),
  ];

  const tokenTable = renderTable({
    head: ["Type", "Tokens", "Cost", "% of Total"],
    rows: tokenRows,
    totals: totalsRow,
  });

  lines.push(section("📊 Token Breakdown:", tokenTable));

  // Cache efficiency
  if (tokens.cache_read > 0 || tokens.cache_write > 0) {
    const cacheEfficiency =
      tokens.cache_read > 0
        ? tokens.cache_read / (tokens.cache_read + tokens.cache_write)
        : 0;

    const cacheColor = getThresholdColor(cacheEfficiency, 0.5); // 50% is good cache usage
    const cacheBar = createProgressBar(cacheEfficiency * 100, 20);

    const cacheLines = [
      `${cacheColor(cacheBar)} ${(cacheEfficiency * 100).toFixed(1)}% hit rate`,
      `${formatTokens(tokens.cache_read)} reads, ${formatTokens(tokens.cache_write)} writes`,
    ];

    if (tokens.cache_read > tokens.cache_write * 2) {
      cacheLines.push(
        chalk.green("💡 Excellent cache utilization - saving costs!"),
      );
    } else if (tokens.cache_write > tokens.cache_read) {
      cacheLines.push(
        chalk.yellow("⚠️  High cache write ratio - consider optimizing"),
      );
    }

    lines.push(section("🧠 Cache Performance:", cacheLines.join("\n")));
  }

  return lines.join("\n");
};

export const formatMultiSessionSummary = (
  sessions: SessionMetrics[],
  level: DisplayLevel = "smart",
): string => {
  if (!sessions.length) return "No sessions found";

  const totals = sessions.reduce(
    (acc, session) => ({
      tokens: {
        input: acc.tokens.input + session.tokens.input,
        output: acc.tokens.output + session.tokens.output,
        reasoning: acc.tokens.reasoning + session.tokens.reasoning,
        cache_write: acc.tokens.cache_write + session.tokens.cache_write,
        cache_read: acc.tokens.cache_read + session.tokens.cache_read,
        total: acc.tokens.total + session.tokens.total,
      },
      cost: {
        input: acc.cost.input + session.cost.input,
        output: acc.cost.output + session.cost.output,
        reasoning: acc.cost.reasoning + session.cost.reasoning,
        cache_write: acc.cost.cache_write + session.cost.cache_write,
        cache_read: acc.cost.cache_read + session.cost.cache_read,
        total: acc.cost.total + session.cost.total,
      },
    }),
    {
      tokens: {
        input: 0,
        output: 0,
        reasoning: 0,
        cache_write: 0,
        cache_read: 0,
        total: 0,
      },
      cost: {
        input: 0,
        output: 0,
        reasoning: 0,
        cache_write: 0,
        cache_read: 0,
        total: 0,
      },
    },
  );

  const avgCacheHitRate =
    sessions.reduce((sum, s) => sum + s.cache_hit_rate, 0) / sessions.length;

  const aggregatedMetrics: SessionMetrics = {
    tokens: totals.tokens,
    cost: totals.cost,
    model_id: "aggregated",
    cache_hit_rate: avgCacheHitRate,
    efficiency_score: 0, // Not meaningful for aggregated
  };

  const lines: string[] = [];
  lines.push(formatTokenBreakdown(aggregatedMetrics, level));

  // Add session-level insights for smart/detailed views
  if (level !== "minimal" && sessions.length > 1) {
    const avgCostPerSession = totals.cost.total / sessions.length;
    const mostExpensiveSession = sessions.reduce((max, s) =>
      s.cost.total > max.cost.total ? s : max,
    );

    const insights: Array<[string, string | number]> = [
      ["Sessions Analyzed", sessions.length],
      ["Average Cost/Session", formatCost(avgCostPerSession)],
      ["Most Expensive", formatCost(mostExpensiveSession.cost.total)],
      [
        "Best Cache Hit Rate",
        `${(Math.max(...sessions.map((s) => s.cache_hit_rate)) * 100).toFixed(1)}%`,
      ],
    ];

    const insightsTable = renderKV(insights);
    lines.push(section("📈 Session Insights:", insightsTable));
  }

  return lines.join("\n");
};
