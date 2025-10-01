import { findModel, calculateModelCost } from "./models-db.js";

export interface TokenBreakdown {
  input: number;
  output: number;
  reasoning: number;
  cache_write: number;
  cache_read: number;
  total: number;
}

export interface CostBreakdown {
  input: number;
  output: number;
  reasoning: number;
  cache_write: number;
  cache_read: number;
  total: number;
}

export interface SessionMetrics {
  tokens: TokenBreakdown;
  cost: CostBreakdown;
  model_id: string;
  cache_hit_rate: number;
  efficiency_score: number;
}

export const calculateCost = async (
  tokens: TokenBreakdown,
  modelId: string,
): Promise<CostBreakdown> => {
  const model = await findModel(modelId);

  if (!model || !model.cost) {
    console.warn(
      `Warning: Unknown model '${modelId}' or no cost data, using zero cost`,
    );
    return {
      input: 0,
      output: 0,
      reasoning: 0,
      cache_write: 0,
      cache_read: 0,
      total: 0,
    };
  }

  const input = (tokens.input / 1_000_000) * (model.cost.input || 0);
  const output = (tokens.output / 1_000_000) * (model.cost.output || 0);
  const reasoning =
    (tokens.reasoning / 1_000_000) *
    (model.cost.reasoning || model.cost.input || 0);
  const cache_write =
    (tokens.cache_write / 1_000_000) * (model.cost.cache_write || 0);
  const cache_read =
    (tokens.cache_read / 1_000_000) * (model.cost.cache_read || 0);

  return {
    input,
    output,
    reasoning,
    cache_write,
    cache_read,
    total: input + output + reasoning + cache_write + cache_read,
  };
};

export const calculateSessionMetrics = async (
  sessionData: any,
): Promise<SessionMetrics> => {
  const tokens: TokenBreakdown = {
    input: sessionData.tokens?.input || 0,
    output: sessionData.tokens?.output || 0,
    reasoning: sessionData.tokens?.reasoning || 0,
    cache_write: sessionData.tokens?.cache?.write || 0,
    cache_read: sessionData.tokens?.cache?.read || 0,
    total: 0,
  };

  tokens.total =
    tokens.input +
    tokens.output +
    tokens.reasoning +
    tokens.cache_write +
    tokens.cache_read;

  const modelId = sessionData.modelID || "unknown";
  const model = await findModel(modelId);

  let cost: CostBreakdown;
  if (model) {
    const totalCost = calculateModelCost(model, {
      input: tokens.input,
      output: tokens.output,
      reasoning: tokens.reasoning,
      cache_read: tokens.cache_read,
      cache_write: tokens.cache_write,
    });

    const totalTokens = tokens.total || 1;

    // Validate inputs to prevent NaN/Infinity
    if (!isFinite(totalTokens) || totalTokens <= 0 || !isFinite(totalCost)) {
      cost = {
        input: 0,
        output: 0,
        reasoning: 0,
        cache_write: 0,
        cache_read: 0,
        total: 0,
      };
    } else {
      cost = {
        input: totalCost * (tokens.input / totalTokens),
        output: totalCost * (tokens.output / totalTokens),
        reasoning: totalCost * (tokens.reasoning / totalTokens),
        cache_write: totalCost * (tokens.cache_write / totalTokens),
        cache_read: totalCost * (tokens.cache_read / totalTokens),
        total: totalCost,
      };
    }
  } else {
    cost = await calculateCost(tokens, modelId);
  }

  const cache_total = tokens.cache_read + tokens.cache_write;
  const cache_hit_rate = cache_total > 0 ? tokens.cache_read / cache_total : 0;

  const efficiency_score =
    cost.total > 0 && tokens.cache_read > 0 && isFinite(cost.total)
      ? (tokens.cache_read * 0.1) / cost.total
      : 0;

  return {
    tokens,
    cost,
    model_id: model ? `${model.provider_id}/${model.model_id}` : modelId,
    cache_hit_rate,
    efficiency_score,
  };
};

export const formatCost = (cost: number, precision = 4): string => {
  if (cost < 0.0001) return "$0.0000";
  return `$${cost.toFixed(precision)}`;
};

export const formatTokens = (tokens: number): string => {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(1)}M`;
};
