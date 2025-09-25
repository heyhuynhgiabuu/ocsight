import { findModel } from './models-db.js';

export interface QuotaConfig {
  amount: number;
  period: 'daily' | 'monthly';
  source: 'default' | 'env' | 'config' | 'cli';
}

export interface QuotaStatus {
  amount: number;
  used: number;
  percentage: number;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'daily' | 'monthly';
  source: string;
}

export interface QuotaPeriod {
  start: Date;
  end: Date;
}

export interface QuotaConfigOptions {
  amount?: number;
  period?: 'daily' | 'monthly';
}

export interface MessageTokens {
  input: number;
  output: number;
  reasoning: number;
  cache_write: number;
  cache_read: number;
}

export function getCurrentQuotaPeriod(period: 'daily' | 'monthly'): QuotaPeriod {
  const now = new Date();
  
  if (period === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }
  
  // Monthly period
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function calculateRealMessageCost(tokens: MessageTokens, modelId: string): Promise<number> {
  const model = await findModel(modelId);
  if (!model || !model.cost) return 0;
  
  const pricing = model.cost;
  let cost = 0;
  
  // Input tokens
  if (tokens.input > 0 && pricing.input) {
    cost += (tokens.input / 1_000_000) * pricing.input;
  }
  
  // Output tokens
  if (tokens.output > 0 && pricing.output) {
    cost += (tokens.output / 1_000_000) * pricing.output;
  }
  
  // Reasoning tokens (use output pricing if no specific reasoning pricing)
  if (tokens.reasoning > 0) {
    const reasoningPrice = pricing.reasoning || pricing.output || 0;
    cost += (tokens.reasoning / 1_000_000) * reasoningPrice;
  }
  
  // Cache write tokens (use input pricing if no specific cache pricing)
  if (tokens.cache_write > 0) {
    const cacheWritePrice = pricing.cache_write || pricing.input || 0;
    cost += (tokens.cache_write / 1_000_000) * cacheWritePrice;
  }
  
  // Cache read tokens (use input pricing if no specific cache pricing)
  if (tokens.cache_read > 0) {
    const cacheReadPrice = pricing.cache_read || pricing.input || 0;
    cost += (tokens.cache_read / 1_000_000) * cacheReadPrice;
  }
  
  return cost;
}

export async function calculateRealQuotaUsage(sessions: any[], period: QuotaPeriod, activeSessionCost?: number): Promise<number> {
  let totalCost = 0;
  
  if (activeSessionCost !== undefined) {
    totalCost += activeSessionCost;
  }
  
  for (const session of sessions) {
    const sessionTime = session.time?.updated || session.time?.created || 0;
    const sessionDate = new Date(sessionTime);
    
    if (sessionDate >= period.start && sessionDate <= period.end) {
      const costCents = session.cost_cents || 0;
      totalCost += (costCents / 100);
    }
  }
  
  return totalCost;
}

export function loadQuotaConfig(options: QuotaConfigOptions = {}): QuotaConfig {
  // Priority: CLI options > Environment > Default
  
  // Default configuration
  let config: QuotaConfig = {
    amount: 10.00,
    period: 'daily',
    source: 'default'
  };
  
  // Environment variables
  const envAmount = process.env.OCSIGHT_QUOTA_AMOUNT;
  const envPeriod = process.env.OCSIGHT_QUOTA_PERIOD as 'daily' | 'monthly';
  
  if (envAmount && !isNaN(Number(envAmount))) {
    config.amount = Number(envAmount);
    config.source = 'env';
  }
  
  if (envPeriod && (envPeriod === 'daily' || envPeriod === 'monthly')) {
    config.period = envPeriod;
    config.source = 'env';
  }
  
  // CLI options (highest priority)
  if (options.amount !== undefined) {
    config.amount = options.amount;
    config.source = 'cli';
  }
  
  if (options.period !== undefined) {
    config.period = options.period;
    config.source = 'cli';
  }
  
  return config;
}

export async function getQuotaStatus(config: QuotaConfig, sessions: any[]): Promise<QuotaStatus> {
  const period = getCurrentQuotaPeriod(config.period);
  const used = await calculateRealQuotaUsage(sessions, period);
  const percentage = Math.min((used / config.amount) * 100, 100);
  
  return {
    amount: config.amount,
    used,
    percentage,
    periodStart: period.start,
    periodEnd: period.end,
    periodType: config.period,
    source: `${config.source} (${config.period})`
  };
}

export function formatQuotaPeriodType(periodType: 'daily' | 'monthly'): string {
  return periodType === 'daily' ? 'Daily' : 'Monthly';
}