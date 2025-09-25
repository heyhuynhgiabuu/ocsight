import chalk from "chalk";
import { createProgressBar, getThresholdColor, formatDuration, createSummaryPanel } from "./ui.js";
import { formatTokens, formatCost } from "./cost.js";

export interface LiveStatus {
  sessionId: string;
  interactions: number;
  totalTokens: number;
  estimatedCost: number;
  currentModel?: string;
  tokenBreakdown?: {
    input: number;
    output: number;
    reasoning: number;
    cache_write: number;
    cache_read: number;
    total: number;
  };
  costBreakdown?: {
    input: number;
    output: number;
    reasoning: number;
    cache_write: number;
    cache_read: number;
    total: number;
  };
  cacheHitRate?: number;
  recentActivity?: {
    tokens: number;
    timestamp: Date;
  };
  quota?: {
    amount: number;
    used: number;
    periodType?: 'daily' | 'monthly';
  };
  context?: {
    used: number;
    total: number;
  };
  burnRate?: number; // tokens per minute
}

export interface LiveOptions {
  refreshInterval: number;
  showProgress: boolean;
  showBurnRate: boolean;
}

export class LiveMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(
    getStatus: () => Promise<LiveStatus | null>,
    options: LiveOptions
  ): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    const updateDisplay = async () => {
      try {
        const status = await getStatus();
        this.renderDashboard(status, options);
      } catch (error) {
        console.error(chalk.red("Error updating live display:"), error);
      }
    };

    // Initial render
    await updateDisplay();
    
    // Set up interval
    this.intervalId = setInterval(updateDisplay, options.refreshInterval * 1000);
    
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      this.stop();
      console.log(chalk.yellow("\nLive monitoring stopped."));
      process.exit(0);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private renderDashboard(status: LiveStatus | null, options: LiveOptions): void {
    // Clear screen and move cursor to top
    process.stdout.write("\x1b[2J\x1b[H");
    
    if (!status) {
      console.log(chalk.red("No active sessions found"));
      return;
    }

    const lines: string[] = [];
    
    // Header
    lines.push(chalk.bold.blue("OpenCode Live Dashboard"));
    lines.push(chalk.dim(`Updated: ${new Date().toLocaleTimeString()}`));
    lines.push("");

    // Session info with token breakdown
    const sessionInfo: Array<[string, string]> = [
      ["Session ID", status.sessionId],
      ["Interactions", status.interactions.toLocaleString()],
      ["Total Tokens", formatTokens(status.totalTokens)],
      ["Total Cost", formatCost(status.estimatedCost)]
    ];
    
    // Add detailed breakdown if available
    if (status.tokenBreakdown && status.costBreakdown) {
      if (status.tokenBreakdown.input > 0) {
        sessionInfo.push(["Input", `${formatTokens(status.tokenBreakdown.input)} (${formatCost(status.costBreakdown.input)})`]);
      }
      if (status.tokenBreakdown.output > 0) {
        sessionInfo.push(["Output", `${formatTokens(status.tokenBreakdown.output)} (${formatCost(status.costBreakdown.output)})`]);
      }
      if (status.tokenBreakdown.cache_read > 0) {
        sessionInfo.push(["Cache Reads", `${formatTokens(status.tokenBreakdown.cache_read)} (${formatCost(status.costBreakdown.cache_read)})`]);
      }
      if (status.cacheHitRate !== undefined) {
        const CACHE_GOOD_THRESHOLD = 0.7;
        const CACHE_POOR_THRESHOLD = 0.3;
        
        const cacheColor = status.cacheHitRate > CACHE_GOOD_THRESHOLD ? chalk.green : 
                          status.cacheHitRate > CACHE_POOR_THRESHOLD ? chalk.yellow : chalk.red;
        sessionInfo.push(["Cache Hit Rate", cacheColor(`${(status.cacheHitRate * 100).toFixed(1)}%`)]);
      }
    }
    
    lines.push(createSummaryPanel("Current Session", sessionInfo));

    // Current model
    if (status.currentModel) {
      lines.push(chalk.yellow(`Model: ${status.currentModel}`));
      lines.push("");
    }

    // Quota progress
    if (status.quota) {
      const quotaColor = getThresholdColor(status.quota.used, status.quota.amount);
      const quotaPct = (status.quota.used / status.quota.amount) * 100;
      const quotaBar = createProgressBar(quotaPct);
      
      const quotaLabel = status.quota.periodType === 'monthly' ? "Monthly Cost Quota" : "Daily Cost Quota";
      lines.push(chalk.cyan.bold(quotaLabel));
      lines.push(`${quotaColor(quotaBar)} $${status.quota.used.toFixed(2)} / $${status.quota.amount.toFixed(2)}`);
      lines.push("");
    }

    // Context window usage
    if (status.context) {
      const contextPct = (status.context.used / status.context.total) * 100;
      const contextColor = getThresholdColor(status.context.used, status.context.total);
      const contextBar = createProgressBar(contextPct);
      
      lines.push(chalk.cyan.bold("Context Window"));
      lines.push(`${contextColor(contextBar)} ${status.context.used.toLocaleString()} / ${status.context.total.toLocaleString()} tokens`);
      lines.push("");
    }

    // Burn rate and recent activity
    if (options.showBurnRate && status.burnRate !== undefined) {
      const burnRateColor = status.burnRate > 0 ? chalk.green : chalk.dim;
      lines.push(chalk.cyan.bold("Activity"));
      lines.push(burnRateColor(`Rate: ${Math.round(status.burnRate).toLocaleString()} tokens/min`));
      
      if (status.recentActivity) {
        const timeSince = Date.now() - status.recentActivity.timestamp.getTime();
        lines.push(chalk.dim(`Last activity: ${formatDuration(timeSince)} ago (${status.recentActivity.tokens.toLocaleString()} tokens)`));
      }
      lines.push("");
    }

    // Instructions
    lines.push(chalk.dim("Press Ctrl+C to stop monitoring"));

    console.log(lines.join("\n"));
  }
}