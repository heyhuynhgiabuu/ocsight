import { OpenCodeData, OpenCodeSession } from "../types/index.js";
import { loadAllData } from "../lib/data.js";

export interface LoadOptions {
  days?: number;
  provider?: string;
  session?: string;
  limit?: number;
  cache?: boolean;
  quiet?: boolean;
}

export interface FilterOptions {
  provider?: string;
  days?: number;
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  minCost?: number;
  maxCost?: number;
}

export class DataService {
  private cachedData: OpenCodeData | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async loadSessions(options: LoadOptions = {}): Promise<OpenCodeSession[]> {
    const now = Date.now();

    // Use cached data if fresh and no specific filters
    if (
      this.cachedData &&
      !options.days &&
      !options.provider &&
      !options.session &&
      now - this.cacheTimestamp < this.CACHE_TTL
    ) {
      return this.cachedData.sessions;
    }

    // Load fresh data
    const data = await loadAllData({
      cache: options.cache !== false,
      days: options.days,
      quiet: options.quiet !== false,
      limit: options.limit,
    });

    // Cache the data
    this.cachedData = data;
    this.cacheTimestamp = now;

    return this.filterSessions(data.sessions, options);
  }

  filterSessions(
    sessions: OpenCodeSession[],
    filters: FilterOptions = {},
  ): OpenCodeSession[] {
    let filtered = sessions;

    // Filter by provider
    if (filters.provider) {
      filtered = filtered.filter(
        (s) =>
          s.model.provider.toLowerCase() === filters.provider!.toLowerCase(),
      );
    }

    // Filter by days
    if (filters.days) {
      const cutoff = Date.now() - filters.days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(
        (s) => (s.time.updated || s.time.created) >= cutoff,
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (s) => new Date(s.time.created) >= filters.startDate!,
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (s) => new Date(s.time.created) <= filters.endDate!,
      );
    }

    // Filter by session ID
    if (filters.sessionId) {
      const sessionToFind = filters.sessionId.startsWith("ses_")
        ? filters.sessionId
        : `ses_${filters.sessionId}`;
      filtered = filtered.filter(
        (s) => s.id === sessionToFind || s.id.startsWith(sessionToFind),
      );
    }

    // Filter by cost
    if (filters.minCost !== undefined) {
      filtered = filtered.filter((s) => s.cost_cents >= filters.minCost!);
    }

    if (filters.maxCost !== undefined) {
      filtered = filtered.filter((s) => s.cost_cents <= filters.maxCost!);
    }

    return filtered;
  }

  sortSessions(
    sessions: OpenCodeSession[],
    sortBy: "cost" | "tokens" | "date" | "messages" = "date",
    order: "asc" | "desc" = "desc",
  ): OpenCodeSession[] {
    const sorted = [...sessions];

    switch (sortBy) {
      case "cost":
        sorted.sort((a, b) => a.cost_cents - b.cost_cents);
        break;
      case "tokens":
        sorted.sort((a, b) => (a.tokens_used || 0) - (b.tokens_used || 0));
        break;
      case "messages":
        sorted.sort((a, b) => a.messages.length - b.messages.length);
        break;
      case "date":
      default:
        sorted.sort(
          (a, b) =>
            (a.time.updated || a.time.created) -
            (b.time.updated || b.time.created),
        );
    }

    return order === "desc" ? sorted.reverse() : sorted;
  }

  getRecentSessions(
    sessions: OpenCodeSession[],
    limit = 10,
  ): OpenCodeSession[] {
    return this.sortSessions(sessions, "date", "desc").slice(0, limit);
  }

  getTopSessionsByCost(
    sessions: OpenCodeSession[],
    limit = 10,
  ): OpenCodeSession[] {
    return this.sortSessions(sessions, "cost", "desc").slice(0, limit);
  }

  getTopSessionsByTokens(
    sessions: OpenCodeSession[],
    limit = 10,
  ): OpenCodeSession[] {
    return this.sortSessions(sessions, "tokens", "desc").slice(0, limit);
  }
}

// Singleton instance
export const dataService = new DataService();
