export interface ProviderCosts {
  [providerId: string]: number;
}

export interface BudgetHealth {
  spent: number;
  limit: number;
  percentage: number;
  remaining: number;
  status: BudgetStatus;
  days_remaining: number | null;
}

export type BudgetStatus = "healthy" | "warning" | "critical" | "exceeded";

export interface ProviderBudgetStatus {
  provider_id: string;
  provider_name: string;
  spent: number;
  limit: number;
  percentage: number;
  status: BudgetStatus;
}

export interface BudgetAlert {
  level: "info" | "warning" | "critical";
  message: string;
  provider?: string;
}

export interface MonthlySpend {
  year: number;
  month: number;
  total: number;
  by_provider: ProviderCosts;
}
