export interface OpenCodeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tools?: ToolUsage[];
}

export interface ToolUsage {
  name: string;
  duration_ms: number;
  timestamp: string;
}

export interface OpenCodeSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: OpenCodeMessage[];
  model: {
    provider: string;
    model: string;
  };
  tokens_used: number;
  cost_cents: number;
}

export interface OpenCodeData {
  sessions: OpenCodeSession[];
}

export interface UsageStatistics {
  totalSessions: number;
  totalMessages: number;
  totalTools: number;
  totalCostCents: number;
  totalTokens: number;
  sessionsByProvider: Record<string, number>;
  toolUsage: Record<string, number>;
  costsByProvider: Record<string, number>;
  tokensByProvider: Record<string, number>;
  dailyStats: Record<
    string,
    {
      sessions: number;
      cost: number;
      tokens: number;
    }
  >;
}

export interface AnalyzeOptions {
  path?: string;
  days?: number;
  start?: string;
  end?: string;
  project?: string;
  excludeProject?: string;
  provider?: string;
  json?: boolean;
  csv?: boolean;
  markdown?: boolean;
}

export interface StatsOptions {
  path?: string;
  tools?: boolean;
  costs?: boolean;
  sessions?: boolean;
  json?: boolean;
}

export interface ExportOptions {
  path?: string;
  format: "csv" | "json" | "markdown";
  output: string;
}
