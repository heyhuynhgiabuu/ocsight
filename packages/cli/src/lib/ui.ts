import chalk from "chalk";

const DEFAULT_PROGRESS_WIDTH = 30;

export const createProgressBar = (percentage: number, width = DEFAULT_PROGRESS_WIDTH): string => {
  const pct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round(width * pct / 100);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${pct.toFixed(1)}%`;
};

const THRESHOLD_CRITICAL = 90;
const THRESHOLD_WARNING = 75;
const THRESHOLD_MODERATE = 50;

export const getThresholdColor = (value: number, threshold: number) => {
  const pct = threshold > 0 ? (value / threshold) * 100 : 0;
  if (pct >= THRESHOLD_CRITICAL) return chalk.red;
  if (pct >= THRESHOLD_WARNING) return chalk.yellow;
  if (pct >= THRESHOLD_MODERATE) return chalk.magenta;
  return chalk.green;
};

const BYTES_UNIT = 1024;
const BYTE_SIZES = ["B", "KB", "MB", "GB"];

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_UNIT));
  return `${parseFloat((bytes / Math.pow(BYTES_UNIT, i)).toFixed(1))} ${BYTE_SIZES[i]}`;
};

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;

export const formatDuration = (ms: number): string => {
  if (ms < MS_IN_SECOND) return `${ms}ms`;
  if (ms < MS_IN_MINUTE) return `${(ms / MS_IN_SECOND).toFixed(1)}s`;
  if (ms < MS_IN_HOUR) return `${(ms / MS_IN_MINUTE).toFixed(1)}m`;
  return `${(ms / MS_IN_HOUR).toFixed(1)}h`;
};

export const createSummaryPanel = (
  title: string, 
  stats: Array<[string, string | number]>
): string => {
  const lines = [
    chalk.cyan.bold(title),
    ...stats.map(([label, value]) => `  ${label}: ${chalk.bold(value)}`),
    ""
  ];
  return lines.join("\n");
};

export const statusIndicator = (
  status: "success" | "warning" | "error" | "info",
  message: string
): string => {
  const indicators = {
    success: chalk.green("✓"),
    warning: chalk.yellow("⚠"),
    error: chalk.red("✗"),
    info: chalk.blue("ℹ")
  };
  return `${indicators[status]} ${message}`;
};

export const highlight = (text: string): string => chalk.cyan.bold(text);