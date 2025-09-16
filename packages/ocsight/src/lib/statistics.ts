import { UsageStatistics } from "../types/index.js";

export function generateDailySummary(stats: UsageStatistics): string {
  const today = new Date().toISOString().split("T")[0];
  const todayStats = stats.dailyStats[today];

  if (!todayStats) {
    return "No activity today";
  }

  return `Today: ${todayStats.sessions} sessions, $${(todayStats.cost / 100).toFixed(2)}, ${todayStats.tokens.toLocaleString()} tokens`;
}

export function generateWeeklySummary(stats: UsageStatistics): string {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let weekSessions = 0;
  let weekCost = 0;
  let weekTokens = 0;

  Object.entries(stats.dailyStats).forEach(([date, dayStats]) => {
    const dateObj = new Date(date);
    if (dateObj >= weekAgo && dateObj <= now) {
      weekSessions += dayStats.sessions;
      weekCost += dayStats.cost;
      weekTokens += dayStats.tokens;
    }
  });

  return `Last 7 days: ${weekSessions} sessions, $${(weekCost / 100).toFixed(2)}, ${weekTokens.toLocaleString()} tokens`;
}

export function generateMonthlySummary(stats: UsageStatistics): string {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let monthSessions = 0;
  let monthCost = 0;
  let monthTokens = 0;

  Object.entries(stats.dailyStats).forEach(([date, dayStats]) => {
    const dateObj = new Date(date);
    if (dateObj >= monthAgo && dateObj <= now) {
      monthSessions += dayStats.sessions;
      monthCost += dayStats.cost;
      monthTokens += dayStats.tokens;
    }
  });

  return `Last 30 days: ${monthSessions} sessions, $${(monthCost / 100).toFixed(2)}, ${monthTokens.toLocaleString()} tokens`;
}

export function calculateAverages(stats: UsageStatistics) {
  const totalDays = Object.keys(stats.dailyStats).length;

  if (totalDays === 0) {
    return {
      avgSessionsPerDay: 0,
      avgCostPerDay: 0,
      avgTokensPerDay: 0,
      avgCostPerSession: 0,
      avgTokensPerSession: 0,
    };
  }

  return {
    avgSessionsPerDay: stats.totalSessions / totalDays,
    avgCostPerDay: stats.totalCostCents / totalDays,
    avgTokensPerDay: stats.totalTokens / totalDays,
    avgCostPerSession:
      stats.totalSessions > 0 ? stats.totalCostCents / stats.totalSessions : 0,
    avgTokensPerSession:
      stats.totalSessions > 0 ? stats.totalTokens / stats.totalSessions : 0,
  };
}

export function getMostActiveDay(
  stats: UsageStatistics,
): { date: string; sessions: number } | null {
  let maxSessions = 0;
  let maxDate = "";

  Object.entries(stats.dailyStats).forEach(([date, dayStats]) => {
    if (dayStats.sessions > maxSessions) {
      maxSessions = dayStats.sessions;
      maxDate = date;
    }
  });

  return maxSessions > 0 ? { date: maxDate, sessions: maxSessions } : null;
}

export function getMostExpensiveDay(
  stats: UsageStatistics,
): { date: string; cost: number } | null {
  let maxCost = 0;
  let maxDate = "";

  Object.entries(stats.dailyStats).forEach(([date, dayStats]) => {
    if (dayStats.cost > maxCost) {
      maxCost = dayStats.cost;
      maxDate = date;
    }
  });

  return maxCost > 0 ? { date: maxDate, cost: maxCost } : null;
}

export function getTopProvider(
  stats: UsageStatistics,
): { name: string; sessions: number } | null {
  let maxSessions = 0;
  let topProvider = "";

  Object.entries(stats.sessionsByProvider).forEach(([provider, sessions]) => {
    if (sessions > maxSessions) {
      maxSessions = sessions;
      topProvider = provider;
    }
  });

  return maxSessions > 0 ? { name: topProvider, sessions: maxSessions } : null;
}
