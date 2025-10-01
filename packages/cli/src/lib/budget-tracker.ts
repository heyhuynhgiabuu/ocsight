import { SessionManager } from "./session-manager.js";
import {
  ProviderCosts,
  BudgetHealth,
  BudgetStatus,
  ProviderBudgetStatus,
  BudgetAlert,
  MonthlySpend,
} from "./budget-types.js";
import { findModel, calculateModelCost } from "./models-db.js";

interface BudgetConfig {
  global_monthly_limit?: number;
  alert_thresholds?: {
    warning: number;
    critical: number;
  };
  providers: {
    [providerId: string]: {
      name: string;
      monthly_limit: number;
      enabled: boolean;
    };
  };
}

export class BudgetTracker {
  private sessionManager: SessionManager;
  private budgetConfig: BudgetConfig | undefined;
  private monthlySpendCache: {
    data: MonthlySpend | null;
    timestamp: number;
    key: string;
  } | null = null;
  private burnRateCache: {
    data: number | null;
    timestamp: number;
  } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(sessionManager: SessionManager, budgetConfig?: BudgetConfig) {
    this.sessionManager = sessionManager;
    this.budgetConfig = budgetConfig;
  }

  async getMonthlySpend(year?: number, month?: number): Promise<MonthlySpend> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth();

    const cacheKey = `${targetYear}-${targetMonth}`;
    const currentTime = Date.now();

    if (
      this.monthlySpendCache &&
      this.monthlySpendCache.key === cacheKey &&
      currentTime - this.monthlySpendCache.timestamp < this.CACHE_TTL_MS
    ) {
      return this.monthlySpendCache.data!;
    }

    const costs: ProviderCosts = {};
    let total = 0;

    // Filter sessions by target month using file mtime BEFORE loading
    const monthStart = new Date(targetYear, targetMonth, 1).getTime();
    const monthEnd = new Date(
      targetYear,
      targetMonth + 1,
      0,
      23,
      59,
      59,
      999,
    ).getTime();

    const recentSessions = this.sessionManager.getSessionsByDateRange(
      monthStart,
      monthEnd,
      1000,
    );

    const modelCache = new Map<string, any>();
    const processedSessions = new Set<string>();

    for (const sessionIndex of recentSessions) {
      try {
        const cleanId = sessionIndex.id.replace(/\u0000/g, "");
        if (processedSessions.has(cleanId)) continue;

        const session = await this.sessionManager.loadSession(cleanId);
        if (!session || !session.messages.length) continue;

        const modelId = `${session.model.provider}/${session.model.model}`;
        const provider = this.extractProvider(modelId);
        if (!provider) continue;

        let model = modelCache.get(modelId);
        if (!model) {
          model = await findModel(modelId);
          if (model) modelCache.set(modelId, model);
        }
        if (!model) continue;

        for (const message of session.messages) {
          if (message.role !== "assistant") continue;

          const messageDate = new Date(message.created);
          if (
            messageDate.getFullYear() === targetYear &&
            messageDate.getMonth() === targetMonth
          ) {
            const cost = calculateModelCost(model, {
              input: message.tokens.input,
              output: message.tokens.output,
              reasoning: message.tokens.reasoning || 0,
              cache_read: message.tokens.cache?.read || 0,
              cache_write: message.tokens.cache?.write || 0,
            });

            if (cost > 0) {
              costs[provider] = (costs[provider] || 0) + cost;
              total += cost;
            }
          }
        }

        processedSessions.add(cleanId);
      } catch (error) {
        continue;
      }
    }

    const result: MonthlySpend = {
      year: targetYear,
      month: targetMonth,
      total,
      by_provider: costs,
    };

    this.monthlySpendCache = {
      data: result,
      timestamp: currentTime,
      key: cacheKey,
    };

    return result;
  }

  async getActiveDaysInMonth(year?: number, month?: number): Promise<number> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth();

    const activeDays = new Set<number>();
    const recentSessions = this.sessionManager.getRecentSessions(1000);
    const processedSessions = new Set<string>();

    for (const sessionIndex of recentSessions) {
      try {
        const cleanId = sessionIndex.id.replace(/\u0000/g, "");
        if (processedSessions.has(cleanId)) continue;

        const session = await this.sessionManager.loadSession(cleanId);
        if (!session || !session.messages.length) continue;

        for (const message of session.messages) {
          if (message.role !== "assistant") continue;

          const messageDate = new Date(message.created);
          if (
            messageDate.getFullYear() === targetYear &&
            messageDate.getMonth() === targetMonth
          ) {
            activeDays.add(messageDate.getDate());
          }
        }

        processedSessions.add(cleanId);
      } catch (error) {
        continue;
      }
    }

    return activeDays.size;
  }

  private extractProvider(modelID: string): string {
    const lower = modelID.toLowerCase();

    if (lower.includes("claude") || lower.includes("anthropic")) {
      return "anthropic";
    }
    if (lower.includes("gpt") || lower.includes("openai")) {
      return "openai";
    }
    if (lower.includes("openrouter") || lower.startsWith("or/")) {
      return "openrouter";
    }
    if (lower.includes("gemini") || lower.includes("google")) {
      return "google";
    }
    if (lower.includes("azure")) {
      return "azure";
    }
    if (lower.includes("bedrock") || lower.includes("aws")) {
      return "aws";
    }
    if (lower.includes("cohere")) {
      return "cohere";
    }
    if (lower.includes("mistral")) {
      return "mistral";
    }

    return "other";
  }

  async getBudgetHealth(
    monthlySpend?: MonthlySpend,
  ): Promise<BudgetHealth | null> {
    if (!this.budgetConfig?.global_monthly_limit) {
      return null;
    }

    const spend = monthlySpend ?? (await this.getMonthlySpend());
    const limit = this.budgetConfig.global_monthly_limit;
    const spent = spend.total;
    const remaining = limit - spent;
    const percentage = (spent / limit) * 100;

    const thresholds = this.budgetConfig.alert_thresholds || {
      warning: 70,
      critical: 90,
    };

    let status: BudgetStatus;
    if (spent >= limit) {
      status = "exceeded";
    } else if (percentage >= thresholds.critical) {
      status = "critical";
    } else if (percentage >= thresholds.warning) {
      status = "warning";
    } else {
      status = "healthy";
    }

    const daysRemaining = await this.calculateDaysRemaining(spent, limit);

    return {
      spent,
      limit,
      percentage,
      remaining,
      status,
      days_remaining: daysRemaining,
    };
  }

  private async calculateDaysRemaining(
    currentSpend: number,
    limit: number,
  ): Promise<number | null> {
    const currentTime = Date.now();

    if (
      this.burnRateCache &&
      currentTime - this.burnRateCache.timestamp < this.CACHE_TTL_MS
    ) {
      const cachedRate = this.burnRateCache.data;
      if (cachedRate === null || cachedRate === 0) return null;
      const remaining = limit - currentSpend;
      return remaining / cachedRate;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = this.sessionManager.getRecentSessions(50);

    let last7DaysCost = 0;
    const activeDays = new Set<number>();

    for (const sessionIndex of recentSessions) {
      try {
        const cleanId = sessionIndex.id.replace(/\u0000/g, "");
        const session = await this.sessionManager.loadSession(cleanId);
        if (!session) continue;

        const sessionDate = new Date(session.time.created);
        if (sessionDate < sevenDaysAgo) continue;

        const cost = session.cost_cents / 100;
        last7DaysCost += cost;
        activeDays.add(sessionDate.getDate());
      } catch (error) {
        continue;
      }
    }

    // Count actual days with activity in the last 7 days
    const activeDaysCount = Math.max(1, activeDays.size);
    const dailyBurnRate =
      last7DaysCost > 0 ? last7DaysCost / activeDaysCount : 0;

    this.burnRateCache = {
      data: dailyBurnRate,
      timestamp: currentTime,
    };

    if (dailyBurnRate <= 0) return null;

    const remaining = limit - currentSpend;
    return remaining / dailyBurnRate;
  }

  async getProviderBudgetStatus(
    monthlySpend?: MonthlySpend,
  ): Promise<ProviderBudgetStatus[]> {
    if (!this.budgetConfig) return [];

    const spend = monthlySpend ?? (await this.getMonthlySpend());
    const statuses: ProviderBudgetStatus[] = [];

    for (const [providerId, config] of Object.entries(
      this.budgetConfig.providers,
    )) {
      if (!config.enabled) continue;

      const spent = spend.by_provider[providerId] || 0;
      const limit = config.monthly_limit;
      const percentage = (spent / limit) * 100;

      let status: BudgetStatus;
      if (spent >= limit) {
        status = "exceeded";
      } else if (percentage >= 90) {
        status = "critical";
      } else if (percentage >= 70) {
        status = "warning";
      } else {
        status = "healthy";
      }

      statuses.push({
        provider_id: providerId,
        provider_name: config.name,
        spent,
        limit,
        percentage,
        status,
      });
    }

    return statuses;
  }

  async getAlerts(monthlySpend?: MonthlySpend): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    const spend = monthlySpend ?? (await this.getMonthlySpend());
    const budgetHealth = await this.getBudgetHealth(spend);
    if (budgetHealth) {
      if (budgetHealth.status === "exceeded") {
        alerts.push({
          level: "critical",
          message: `Budget exceeded by $${(budgetHealth.spent - budgetHealth.limit).toFixed(2)}`,
        });
      } else if (budgetHealth.status === "critical") {
        alerts.push({
          level: "critical",
          message: `Budget ${budgetHealth.percentage.toFixed(0)}% used - immediate action required`,
        });
      } else if (budgetHealth.status === "warning") {
        alerts.push({
          level: "warning",
          message: `Budget ${budgetHealth.percentage.toFixed(0)}% used - monitor closely`,
        });
      }

      if (
        budgetHealth.days_remaining !== null &&
        budgetHealth.days_remaining < 7
      ) {
        alerts.push({
          level: "warning",
          message: `Budget will be exhausted in ${budgetHealth.days_remaining.toFixed(1)} days at current rate`,
        });
      }
    }

    const providerStatuses = await this.getProviderBudgetStatus(spend);
    for (const status of providerStatuses) {
      if (status.status === "exceeded") {
        alerts.push({
          level: "critical",
          message: `${status.provider_name} budget exceeded ($${status.spent.toFixed(2)} / $${status.limit})`,
          provider: status.provider_id,
        });
      } else if (status.status === "critical") {
        alerts.push({
          level: "critical",
          message: `${status.provider_name} approaching limit (${status.percentage.toFixed(0)}%)`,
          provider: status.provider_id,
        });
      } else if (status.status === "warning") {
        alerts.push({
          level: "warning",
          message: `${status.provider_name} at ${status.percentage.toFixed(0)}% of budget`,
          provider: status.provider_id,
        });
      }
    }

    return alerts;
  }

  async getHistoricalSpend(months: number): Promise<MonthlySpend[]> {
    const results: MonthlySpend[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const spend = await this.getMonthlySpend(
        targetDate.getFullYear(),
        targetDate.getMonth(),
      );

      results.push(spend);
    }

    return results;
  }
}
