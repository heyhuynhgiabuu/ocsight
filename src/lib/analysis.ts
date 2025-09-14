import {
  OpenCodeData,
  OpenCodeSession,
  UsageStatistics,
  AnalyzeOptions,
} from "../types";

export function filterSessions(
  data: OpenCodeData,
  options: AnalyzeOptions,
): OpenCodeSession[] {
  let sessions = data.sessions;

  // Filter by date range
  if (options.days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.days);
    sessions = sessions.filter(
      (session) => new Date(session.created_at) >= cutoffDate,
    );
  }

  if (options.start) {
    const startDate = new Date(options.start);
    sessions = sessions.filter(
      (session) => new Date(session.created_at) >= startDate,
    );
  }

  if (options.end) {
    const endDate = new Date(options.end);
    sessions = sessions.filter(
      (session) => new Date(session.created_at) <= endDate,
    );
  }

  // Filter by provider
  if (options.provider) {
    sessions = sessions.filter(
      (session) =>
        session.model.provider.toLowerCase() ===
        options.provider!.toLowerCase(),
    );
  }

  // Filter by project (this would require project detection logic)
  if (options.project) {
    sessions = sessions.filter((session) =>
      session.title.toLowerCase().includes(options.project!.toLowerCase()),
    );
  }

  if (options.excludeProject) {
    sessions = sessions.filter(
      (session) =>
        !session.title
          .toLowerCase()
          .includes(options.excludeProject!.toLowerCase()),
    );
  }

  return sessions;
}

export function calculateStatistics(
  sessions: OpenCodeSession[],
): UsageStatistics {
  const stats: UsageStatistics = {
    totalSessions: sessions.length,
    totalMessages: 0,
    totalTools: 0,
    totalCostCents: 0,
    totalTokens: 0,
    sessionsByProvider: {},
    toolUsage: {},
    costsByProvider: {},
    tokensByProvider: {},
    dailyStats: {},
  };

  sessions.forEach((session) => {
    const provider = session.model.provider;

    // Aggregate totals
    stats.totalMessages += session.messages.length;
    stats.totalCostCents += session.cost_cents || 0;
    stats.totalTokens += session.tokens_used || 0;

    // Provider stats
    stats.sessionsByProvider[provider] =
      (stats.sessionsByProvider[provider] || 0) + 1;
    stats.costsByProvider[provider] =
      (stats.costsByProvider[provider] || 0) + (session.cost_cents || 0);
    stats.tokensByProvider[provider] =
      (stats.tokensByProvider[provider] || 0) + (session.tokens_used || 0);

    // Tool usage
    session.messages.forEach((message) => {
      if (message.tools) {
        message.tools.forEach((tool) => {
          stats.totalTools++;
          stats.toolUsage[tool.name] = (stats.toolUsage[tool.name] || 0) + 1;
        });
      }
    });

    // Daily stats
    const date = new Date(session.created_at).toISOString().split("T")[0];
    if (!stats.dailyStats[date]) {
      stats.dailyStats[date] = { sessions: 0, cost: 0, tokens: 0 };
    }
    stats.dailyStats[date].sessions++;
    stats.dailyStats[date].cost += session.cost_cents || 0;
    stats.dailyStats[date].tokens += session.tokens_used || 0;
  });

  return stats;
}

export function getTopTools(
  toolUsage: Record<string, number>,
  limit = 10,
): Array<{ name: string; count: number }> {
  return Object.entries(toolUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function formatCostInDollars(costCents: number): string {
  return `$${(costCents / 100).toFixed(2)}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}
