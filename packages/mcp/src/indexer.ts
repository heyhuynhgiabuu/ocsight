import { loadAllData } from "./lib/data";
import { calculateStatistics } from "./lib/analysis";
import { OpenCodeSession, UsageStatistics } from "./types";

interface Cache {
  sessionsById: Map<string, OpenCodeSession>;
  stats: UsageStatistics;
  sessionArray: OpenCodeSession[];
}

let cache: Cache;

export async function buildIndex() {
  const data = await loadAllData();
  const stats = calculateStatistics(data.sessions);

  cache = {
    sessionsById: new Map(data.sessions.map((s) => [s.id, s])),
    stats,
    sessionArray: data.sessions,
  };
}

export function getStats(): UsageStatistics | undefined {
  return cache?.stats;
}

export function getSession(id: string): OpenCodeSession | undefined {
  return cache?.sessionsById.get(id);
}

export function getSessionsArray(): OpenCodeSession[] {
  return cache?.sessionArray || [];
}

export function listProviders(): string[] {
  if (!cache) return [];
  return Object.keys(cache.stats.sessionsByProvider);
}

export function computeUsageSummary({
  days,
  provider,
}: { days?: number; provider?: string } = {}): UsageStatistics | {} {
  if (!cache) return {};

  let sessions = cache.sessionArray;

  if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    sessions = sessions.filter((s) => new Date(s.created_at) >= cutoff);
  }

  if (provider) {
    sessions = sessions.filter(
      (s) => s.model.provider.toLowerCase() === provider.toLowerCase(),
    );
  }

  return calculateStatistics(sessions);
}
