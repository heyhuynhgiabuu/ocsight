import chalk from "chalk";
import {
  BURN_RATE_HIGH_THRESHOLD,
  DEFAULT_BOX_WIDTH,
  MAX_PERCENTAGE,
  MS_PER_MINUTE,
  MS_PER_HOUR,
} from "./constants.js";
import { runtime } from "./runtime-compat.js";

const BURN_RATE_NORMAL_THRESHOLD = 20000;
const SESSION_START_TIME = Date.now();

export interface BoxedSection {
  title: string;
  content: string[];
  color?: typeof chalk.cyan;
  progressBar?: {
    percent: number;
    text: string;
    color?: typeof chalk.cyan;
  };
}

export function stripAnsi(str: string): string {
  return runtime.stripAnsi(str);
}

export function createBox(
  sections: BoxedSection[],
  width: number = DEFAULT_BOX_WIDTH,
): string[] {
  const lines: string[] = [];
  const termWidth = process.stdout.columns || 120;
  const boxWidth = Math.min(width, termWidth);

  sections.forEach((section, index) => {
    const borderColor = section.color || chalk.white;

    if (index === 0) {
      lines.push(borderColor(`┌${"─".repeat(boxWidth - 2)}┐`));
    }

    if (section.title) {
      const titleText = `  ${section.title.toUpperCase()}  `;
      const titlePadding = boxWidth - 4 - stripAnsi(titleText).length;
      lines.push(
        borderColor("│ ") +
          chalk.bold.white(titleText) +
          " ".repeat(Math.max(0, titlePadding)) +
          borderColor(" │"),
      );
    }

    if (section.progressBar) {
      const { percent, text } = section.progressBar;
      const barWidth = Math.floor(boxWidth * 0.6);
      const filled = Math.floor(
        (barWidth * Math.min(percent, MAX_PERCENTAGE)) / MAX_PERCENTAGE,
      );
      const empty = barWidth - filled;

      const progressColor =
        percent >= 90 ? chalk.red : percent >= 70 ? chalk.yellow : chalk.cyan;

      const bar =
        "[" +
        progressColor("█".repeat(filled)) +
        chalk.gray("░".repeat(empty)) +
        "]";
      const percentText = chalk.bold.white(`${percent.toFixed(1)}%`);
      const rightText = chalk.gray(`(${text})`);

      const leftSide = `${bar}  ${percentText}`;
      const padding =
        boxWidth - 4 - stripAnsi(leftSide).length - stripAnsi(rightText).length;

      lines.push(
        borderColor("│ ") +
          leftSide +
          " ".repeat(Math.max(0, padding)) +
          rightText +
          borderColor(" │"),
      );
    }

    section.content.forEach((line) => {
      const padding = boxWidth - 4 - stripAnsi(line).length;
      lines.push(
        borderColor("│ ") +
          line +
          " ".repeat(Math.max(0, padding)) +
          borderColor(" │"),
      );
    });

    if (index === sections.length - 1) {
      lines.push(borderColor(`└${"─".repeat(boxWidth - 2)}┘`));
    } else {
      lines.push(borderColor(`├${"─".repeat(boxWidth - 2)}┤`));
    }
  });

  return lines;
}

export function formatBurnRate(rate: number): {
  text: string;
  color: typeof chalk.green;
  status: string;
} {
  if (rate === 0) {
    return {
      text: "IDLE",
      color: chalk.gray,
      status: "No activity",
    };
  }

  if (rate < BURN_RATE_NORMAL_THRESHOLD) {
    return {
      text: "NORMAL",
      color: chalk.green,
      status: `${rate.toLocaleString()} tokens/min`,
    };
  }

  if (rate < BURN_RATE_HIGH_THRESHOLD) {
    return {
      text: "HIGH",
      color: chalk.yellow,
      status: `${rate.toLocaleString()} tokens/min`,
    };
  }

  return {
    text: "EXTREME",
    color: chalk.red,
    status: `${rate.toLocaleString()} tokens/min`,
  };
}

export function formatElapsedTime(
  startTime: number = SESSION_START_TIME,
): string {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / MS_PER_HOUR);
  const minutes = Math.floor((elapsed % MS_PER_HOUR) / MS_PER_MINUTE);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function calculateProjection(
  currentTokens: number,
  burnRate: number,
  limit: number,
  currentCost: number,
): {
  projectedTokens: number;
  projectedCost: number;
  timeToLimit: string;
  status: string;
  statusColor: typeof chalk.green;
} {
  if (burnRate === 0) {
    return {
      projectedTokens: currentTokens,
      projectedCost: currentCost,
      timeToLimit: "N/A",
      status: "STABLE",
      statusColor: chalk.green,
    };
  }

  const remainingTokens = limit - currentTokens;
  const minutesToLimit = remainingTokens / burnRate;
  const hoursToLimit = minutesToLimit / 60;

  const projectedTokens = Math.min(currentTokens + burnRate * 60, limit);
  const costPerToken = currentCost / (currentTokens || 1);
  const projectedCost = projectedTokens * costPerToken;

  let timeToLimit: string;
  if (hoursToLimit > 24) {
    timeToLimit = `${Math.floor(hoursToLimit / 24)}d`;
  } else if (hoursToLimit > 1) {
    timeToLimit = `${Math.floor(hoursToLimit)}h`;
  } else {
    timeToLimit = `${Math.floor(minutesToLimit)}m`;
  }

  const percentUsed = (currentTokens / limit) * MAX_PERCENTAGE;
  let status: string;
  let statusColor: typeof chalk.green;

  if (percentUsed >= 90) {
    status = "⚠ APPROACHING LIMIT";
    statusColor = chalk.red;
  } else if (percentUsed >= 75) {
    status = "⚠ HIGH USAGE";
    statusColor = chalk.yellow;
  } else {
    status = "✓ WITHIN BUDGET";
    statusColor = chalk.green;
  }

  return {
    projectedTokens,
    projectedCost,
    timeToLimit,
    status,
    statusColor,
  };
}

export function createCompactProgressBar(
  percent: number,
  width: number = 30,
  showPercentage: boolean = true,
): string {
  const filled = Math.floor(
    (width * Math.min(percent, MAX_PERCENTAGE)) / MAX_PERCENTAGE,
  );
  const empty = width - filled;

  const color =
    percent >= 90 ? chalk.red : percent >= 70 ? chalk.yellow : chalk.cyan;

  const bar =
    color("[") +
    color("█".repeat(filled)) +
    chalk.gray("░".repeat(empty)) +
    color("]");

  if (showPercentage) {
    return `${bar} ${percent.toFixed(1)}%`;
  }

  return bar;
}
