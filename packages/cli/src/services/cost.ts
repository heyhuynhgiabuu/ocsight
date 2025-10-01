import { OpenCodeSession } from "../types/index.js";
import { calculateSessionMetrics } from "../lib/cost.js";
import { findModel, calculateModelCost } from "../lib/models-db.js";

export interface CostSummary {
  totalCostCents: number;
  totalTokens: number;
  averageCostPerSession: number;
  averageTokensPerSession: number;
  costsByProvider: Record<string, number>;
  tokensByProvider: Record<string, number>;
  sessionsByProvider: Record<string, number>;
}

export interface DailyCost {
  date: string;
  sessions: number;
  costCents: number;
  tokens: number;
}

export class CostService {
  async calculateSessionCost(session: OpenCodeSession): Promise<number> {
    try {
      const modelId = `${session.model.provider}/${session.model.model}`;
      const modelData = await findModel(modelId);

      if (!modelData) {
        // Fallback to stored cost
        return session.cost_cents;
      }

      // Distribute tokens ensuring no loss due to Math.floor
      const total = session.tokens_used || 0;
      const input = Math.floor(total * 0.7);
      const output = Math.floor(total * 0.2);
      const reasoning = Math.floor(total * 0.05);
      const cache_read = Math.floor(total * 0.02);
      const cache_write = total - (input + output + reasoning + cache_read); // Remainder to prevent token loss

      const tokenDistribution = {
        input,
        output,
        reasoning,
        cache_read,
        cache_write: Math.max(0, cache_write), // Ensure non-negative
      };

      const costInDollars = calculateModelCost(modelData, tokenDistribution);
      return Math.round(costInDollars * 100); // Convert to cents
    } catch (error) {
      // Fallback to stored cost if calculation fails
      return session.cost_cents;
    }
  }

  async aggregateCosts(sessions: OpenCodeSession[]): Promise<CostSummary> {
    const summary: CostSummary = {
      totalCostCents: 0,
      totalTokens: 0,
      averageCostPerSession: 0,
      averageTokensPerSession: 0,
      costsByProvider: {},
      tokensByProvider: {},
      sessionsByProvider: {},
    };

    // Calculate costs for each session
    for (const session of sessions) {
      const cost = await this.calculateSessionCost(session);
      const tokens = session.tokens_used || 0;
      const provider = session.model.provider;

      summary.totalCostCents += cost;
      summary.totalTokens += tokens;

      // Aggregate by provider
      summary.costsByProvider[provider] =
        (summary.costsByProvider[provider] || 0) + cost;
      summary.tokensByProvider[provider] =
        (summary.tokensByProvider[provider] || 0) + tokens;
      summary.sessionsByProvider[provider] =
        (summary.sessionsByProvider[provider] || 0) + 1;
    }

    // Calculate averages
    if (sessions.length > 0) {
      summary.averageCostPerSession = summary.totalCostCents / sessions.length;
      summary.averageTokensPerSession = summary.totalTokens / sessions.length;
    }

    return summary;
  }

  getDailyCosts(sessions: OpenCodeSession[]): DailyCost[] {
    const dailyMap = new Map<string, DailyCost>();

    for (const session of sessions) {
      const date = new Date(session.time.created).toISOString().split("T")[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          sessions: 0,
          costCents: 0,
          tokens: 0,
        });
      }

      const daily = dailyMap.get(date)!;
      daily.sessions++;
      daily.costCents += session.cost_cents;
      daily.tokens += session.tokens_used || 0;
    }

    // Sort by date descending
    return Array.from(dailyMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }

  getProviderBreakdown(summary: CostSummary): Array<{
    provider: string;
    sessions: number;
    costCents: number;
    tokens: number;
    percentage: number;
  }> {
    return Object.keys(summary.sessionsByProvider)
      .map((provider) => ({
        provider,
        sessions: summary.sessionsByProvider[provider],
        costCents: summary.costsByProvider[provider] || 0,
        tokens: summary.tokensByProvider[provider] || 0,
        percentage:
          summary.totalCostCents > 0
            ? ((summary.costsByProvider[provider] || 0) /
                summary.totalCostCents) *
              100
            : 0,
      }))
      .sort((a, b) => b.costCents - a.costCents);
  }

  formatCostInDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  getCostInsights(summary: CostSummary): string[] {
    const insights: string[] = [];

    // High average cost per session
    if (summary.averageCostPerSession > 100) {
      // More than $1
      insights.push(
        "Consider using more cost-effective models for routine tasks",
      );
    }

    // High token usage
    if (summary.totalTokens > 1_000_000) {
      insights.push(
        "Implement token optimization strategies like prompt compression",
      );
    }

    // Multiple providers
    if (Object.keys(summary.sessionsByProvider).length > 2) {
      insights.push(
        "Consider consolidating to the most cost-effective provider",
      );
    }

    // Dominant expensive provider
    const providers = this.getProviderBreakdown(summary);
    if (providers.length > 0 && providers[0].percentage > 80) {
      insights.push(
        `${providers[0].provider} accounts for ${providers[0].percentage.toFixed(0)}% of costs`,
      );
    }

    return insights;
  }
}

// Singleton instance
export const costService = new CostService();
