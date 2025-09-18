import { OpenCodeData, OpenCodeSession, UsageStatistics, AnalyzeOptions } from "../types/index";
export declare function filterSessions(data: OpenCodeData, options: AnalyzeOptions): OpenCodeSession[];
export declare function calculateStatistics(sessions: OpenCodeSession[]): UsageStatistics;
export declare function getTopTools(toolUsage: Record<string, number>, limit?: number): Array<{
    name: string;
    count: number;
}>;
export declare function formatCostInDollars(costCents: number): string;
export declare function formatNumber(num: number): string;
//# sourceMappingURL=analysis.d.ts.map