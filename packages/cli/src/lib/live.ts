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

    const elapsedTime = status.recentActivity
      ? formatElapsedTime(
          Date.now() - (Date.now() - status.recentActivity.timestamp.getTime()),
        )
      : formatElapsedTime();

    const contextPercent = status.context
      ? (status.context.used / status.context.total) * MAX_PERCENTAGE
      : 0;

    const burnRateInfo = formatBurnRate(status.burnRate || 0);

    const sessionStartTime = new Date();
    sessionStartTime.setHours(
      sessionStartTime.getHours() - SESSION_START_TIME_HOURS_AGO,
    );

    // Get project info
    const projectInfo = await detectProjectInfo();
    const projectName = projectInfo?.name || "Unknown Project";

    // SESSION section - basic session info with context usage
    sections.push({
      title: "SESSION",
      content: [
        chalk.white("Project: ") +
          chalk.cyan(projectName) +
          chalk.white("  ID: ") +
          chalk.cyan(status.sessionId) +
          chalk.white("  Started: ") +
          chalk.cyan(sessionStartTime.toLocaleTimeString()) +
          chalk.white("  Elapsed: ") +
          chalk.cyan(elapsedTime),
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

    // USAGE section - current session usage
    const tokensText = formatTokens(status.totalTokens);
    const costText = formatCost(status.estimatedCost);
    const burnText =
      burnRateInfo.status === "No activity"
        ? "IDLE"
        : `${burnRateInfo.status} ${burnRateInfo.text}`;
    const modelInfo = status.currentModel
      ? status.currentModel.split("/").slice(-1)[0]
      : "unknown";

    sections.push({
      title: "USAGE",
      content: [
        chalk.white("Model: ") +
          chalk.cyan(modelInfo) +
          chalk.white("  Tokens: ") +
          chalk.bold.cyan(tokensText) +
          chalk.white("  Cost: ") +
          chalk.bold.green(costText) +
          chalk.white("  Burn: ") +
          burnRateInfo.color(burnText),
      ],
      color: chalk.green,
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
