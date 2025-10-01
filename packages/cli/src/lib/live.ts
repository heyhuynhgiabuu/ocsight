import chalk from "chalk";
import { formatTokens, formatCost } from "./cost.js";
import {
  createBox,
  BoxedSection,
  formatBurnRate,
  formatElapsedTime,
} from "./live-ui.js";
import { detectProjectInfo } from "./project-utils.js";
import {
  MS_PER_SECOND,
  SESSION_START_TIME_HOURS_AGO,
  MAX_PERCENTAGE,
} from "./constants.js";
import {
  BudgetHealth,
  ProviderBudgetStatus,
  BudgetAlert,
} from "./budget-types.js";

export interface LiveStatus {
  sessionId: string;
  interactions: number;
  totalTokens: number;
  estimatedCost: number;
  currentModel?: string;
  projectName?: string;
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
  context?: {
    used: number;
    total: number;
  };
  burnRate?: number;
  modelTotals?: {
    sessions: number;
    totalTokens: number;
    totalCost: number;
    avgTokensPerSession: number;
    avgCostPerSession: number;
  };
  budgetHealth?: BudgetHealth | null;
  providerBudgets?: ProviderBudgetStatus[];
  budgetAlerts?: BudgetAlert[];
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
    options: LiveOptions,
  ): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    const updateDisplay = async () => {
      try {
        const status = await getStatus();
        await this.renderDashboard(status, options);
      } catch (error) {
        console.error(chalk.red("Error updating live display:"), error);
      }
    };

    // Initial render
    await updateDisplay();

    // Set up interval
    this.intervalId = setInterval(
      updateDisplay,
      options.refreshInterval * MS_PER_SECOND,
    );

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

  private async renderDashboard(
    status: LiveStatus | null,
    options: LiveOptions,
  ): Promise<void> {
    process.stdout.write("\x1b[2J\x1b[H");

    if (!status) {
      const errorBox = createBox([
        {
          title: "ERROR",
          content: [
            "No active sessions found",
            "",
            chalk.yellow("Possible reasons:"),
            chalk.dim("• No OpenCode sessions in the last year"),
            chalk.dim("• Sessions have no token/cost data"),
            chalk.dim("• Data path is incorrect"),
            "",
            chalk.white("Try: ocsight config doctor to check paths"),
          ],
          color: chalk.red,
        },
      ]);
      console.log(errorBox.join("\n"));
      return;
    }

    const sections: BoxedSection[] = [];

    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();

    if (status.budgetHealth) {
      const health = status.budgetHealth;
      const percent = Math.min(100, health.percentage);
      const barLength = 40;
      const filled = Math.floor((percent / 100) * barLength);
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

      const statusColor =
        health.status === "exceeded" || health.status === "critical"
          ? chalk.red
          : health.status === "warning"
            ? chalk.yellow
            : chalk.green;

      const statusIcon =
        health.status === "exceeded"
          ? "🔴"
          : health.status === "critical"
            ? "🔴"
            : health.status === "warning"
              ? "🟡"
              : "🟢";

      const content: string[] = [
        statusColor(bar) +
          `  ${percent.toFixed(1)}%     (${formatCost(health.spent)} / ${formatCost(health.limit)})`,
      ];

      if (health.days_remaining !== null && health.days_remaining < 30) {
        content.push(
          statusIcon +
            ` ${formatCost(health.remaining)} remaining • ${health.days_remaining.toFixed(1)} days at current rate`,
        );
      } else {
        content.push(statusIcon + ` ${formatCost(health.remaining)} remaining`);
      }

      sections.push({
        title: `BUDGET HEALTH (${monthName} ${year})`,
        content,
        color: statusColor,
      });
    }

    if (status.providerBudgets && status.providerBudgets.length > 0) {
      const content: string[] = [];

      for (const provider of status.providerBudgets) {
        const statusIcon =
          provider.status === "exceeded"
            ? "🔴"
            : provider.status === "critical"
              ? "🔴"
              : provider.status === "warning"
                ? "🟡"
                : "🟢";

        const percentage = Math.min(100, provider.percentage);

        content.push(
          `${statusIcon} ${chalk.white(provider.provider_name.padEnd(15))} ${formatCost(provider.spent).padEnd(8)}  (${percentage.toFixed(0)}%)  [${formatCost(provider.limit)} limit]`,
        );
      }

      sections.push({
        title: "PROVIDER BREAKDOWN",
        content,
        color: chalk.cyan,
      });
    }

    if (status.budgetAlerts && status.budgetAlerts.length > 0) {
      const content: string[] = status.budgetAlerts.map((alert) => {
        const icon = alert.level === "critical" ? "🔴" : "🟡";
        return `${icon} ${alert.message}`;
      });

      sections.push({
        title: "ALERTS",
        content,
        color: chalk.yellow,
      });
    }

    const contextPercent = status.context
      ? (status.context.used / status.context.total) * MAX_PERCENTAGE
      : 0;

    const sessionStartTime = new Date();
    sessionStartTime.setHours(
      sessionStartTime.getHours() - SESSION_START_TIME_HOURS_AGO,
    );

    const projectInfo = await detectProjectInfo();
    const projectName = projectInfo?.name || "Unknown Project";

    const modelInfo = status.currentModel
      ? status.currentModel.split("/").slice(-1)[0]
      : "unknown";

    const timeSinceLastMessage = status.recentActivity?.timestamp
      ? Math.floor(
          (Date.now() - status.recentActivity.timestamp.getTime()) / 1000,
        )
      : null;

    const lastActivityText =
      timeSinceLastMessage !== null
        ? timeSinceLastMessage < 60
          ? `${timeSinceLastMessage}s ago`
          : timeSinceLastMessage < 3600
            ? `${Math.floor(timeSinceLastMessage / 60)}m ago`
            : `${Math.floor(timeSinceLastMessage / 3600)}h ago`
        : "Unknown";

    // SESSION section - basic session info with context usage
    sections.push({
      title: "SESSION",
      content: [
        chalk.white("Project: ") +
          chalk.cyan(projectName) +
          chalk.white("  ID: ") +
          chalk.cyan(status.sessionId) +
          chalk.white("  Last: ") +
          chalk.cyan(lastActivityText) +
          chalk.white("  Model: ") +
          chalk.cyan(modelInfo),
      ],
      progressBar: status.context
        ? {
            percent: contextPercent,
            text: `Context: ${formatTokens(status.context.used)}/${formatTokens(status.context.total)}`,
            color:
              contextPercent > 90
                ? chalk.red
                : contextPercent > 70
                  ? chalk.yellow
                  : chalk.green,
          }
        : undefined,
      color: chalk.cyan,
    });

    // ACTIVITY section (last 30 min rolling average)
    const recentTokens = status.recentActivity?.tokens || 0;
    const burnRatePerHour = status.burnRate || 0;
    const costPer30Min = (burnRatePerHour / 60) * 30;
    const tokensPerMin =
      recentTokens > 0 ? Math.floor(recentTokens / 30 / 1000) : 0;

    const isActive = timeSinceLastMessage !== null && timeSinceLastMessage < 60;
    const isRecent =
      timeSinceLastMessage !== null && timeSinceLastMessage < 300;

    const statusText = isActive ? "ACTIVE" : isRecent ? "RECENT" : "IDLE";

    const burnRateColor =
      burnRatePerHour > 20
        ? chalk.red
        : burnRatePerHour > 10
          ? chalk.yellow
          : chalk.green;

    const statusColor = isActive
      ? chalk.bold.green
      : isRecent
        ? chalk.yellow
        : chalk.dim;

    sections.push({
      title: `ACTIVITY (${statusText}) - 30min avg`,
      content:
        recentTokens > 0
          ? [
              statusColor("● ") +
                chalk.white("Spending: ") +
                burnRateColor.bold(`${formatCost(burnRatePerHour, 2)}/hour`) +
                chalk.white("  Speed: ") +
                chalk.cyan(`${tokensPerMin}K tok/min`) +
                chalk.white("  Recent: ") +
                chalk.green(`${formatCost(costPer30Min, 2)}`),
            ]
          : [chalk.dim("○ No activity in last 30 minutes")],
      color: chalk.cyan,
    });

    // TOTALS section - session cumulative
    const tokensText = formatTokens(status.totalTokens);
    const costText = formatCost(status.estimatedCost);

    sections.push({
      title: "SESSION TOTALS",
      content: [
        chalk.white("Messages: ") +
          chalk.cyan(status.interactions.toString()) +
          chalk.white("  Tokens: ") +
          chalk.cyan(tokensText) +
          chalk.white("  Cost: ") +
          chalk.cyan(costText),
      ],
      color: chalk.dim.white,
    });

    // TOTALS section - aggregate stats for this model
    if (status.modelTotals && status.modelTotals.sessions > 0) {
      const avgTokensText = formatTokens(
        Math.floor(status.modelTotals.avgTokensPerSession),
      );
      const avgCostText = formatCost(status.modelTotals.avgCostPerSession);

      sections.push({
        title: "TOTALS",
        content: [
          chalk.white("Model Stats: ") +
            chalk.cyan(`${status.modelTotals.sessions} sessions`) +
            chalk.white("  Total: ") +
            chalk.cyan(formatTokens(status.modelTotals.totalTokens)) +
            chalk.white(" / ") +
            chalk.green(formatCost(status.modelTotals.totalCost)) +
            chalk.white("  Avg: ") +
            chalk.cyan(avgTokensText) +
            chalk.white(" / ") +
            chalk.green(avgCostText),
        ],
        color: chalk.magenta,
      });
    }

    // Footer info
    sections.push({
      title: "",
      content: [
        chalk.white("Refreshing every ") +
          chalk.cyan(`${options.refreshInterval}s`) +
          chalk.white("  Press ") +
          chalk.yellow("Ctrl+C") +
          chalk.white(" to stop"),
      ],
      color: chalk.gray,
    });

    // Clean header without box wrapper
    const header =
      chalk.bold.cyan("OpenCode Live Monitor") +
      chalk.dim(" • ") +
      chalk.white("Real-time token usage and cost tracking");

    console.log(header);
    console.log();

    const mainSections = sections.slice(0, -1);
    if (mainSections.length > 0) {
      const mainBox = createBox(mainSections);
      console.log(mainBox.join("\n"));
    }

    console.log();

    const footer = sections[sections.length - 1];
    if (footer && footer.content.length > 0) {
      console.log(footer.content[0]);
    }
  }
}
