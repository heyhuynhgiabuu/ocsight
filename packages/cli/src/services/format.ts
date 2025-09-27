import chalk from "chalk";
import Table from "cli-table3";

export interface TableOptions {
  head: string[];
  rows: any[][];
  totals?: any[];
  summary?: Array<[string, any]>;
  align?: string[];
}

export class FormatService {
  formatCurrency(cents: number): string {
    if (cents === 0) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  }

  formatNumber(value: number): string {
    if (value === 0) return "0";
    return value.toLocaleString();
  }

  formatPercentage(value: number, decimals = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  formatDate(date: Date | number | string): string {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  }

  formatDuration(ms: number): string {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(0)}m`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  }

  renderTable(options: TableOptions): string {
    const table = new Table({
      head: options.head.map((h) => chalk.cyan(h)),
      style: { head: [], border: [] },
      chars: {
        top: "─",
        "top-mid": "┬",
        "top-left": "┌",
        "top-right": "┐",
        bottom: "─",
        "bottom-mid": "┴",
        "bottom-left": "└",
        "bottom-right": "┘",
        left: "│",
        "left-mid": "├",
        mid: "─",
        "mid-mid": "┼",
        right: "│",
        "right-mid": "┤",
        middle: "│",
      },
    });

    // Add rows
    options.rows.forEach((row) => {
      table.push(row);
    });

    // Add separator and totals if provided
    if (options.totals) {
      table.push(Array(options.head.length).fill(""));
      table.push(
        options.totals.map((val, i) =>
          i === 0 ? chalk.bold(val) : chalk.bold(val),
        ),
      );
    }

    // Add summary rows if provided
    if (options.summary) {
      options.summary.forEach(([key, value]) => {
        const summaryRow = Array(options.head.length).fill("");
        summaryRow[0] = chalk.blue(key);
        summaryRow[1] = chalk.bold(value);
        table.push(summaryRow);
      });
    }

    return table.toString();
  }

  renderKeyValue(pairs: Array<[string, any]>): string {
    const maxKeyLength = Math.max(...pairs.map(([k]) => k.length));

    return pairs
      .map(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLength);
        return `${chalk.cyan(paddedKey)} │ ${chalk.bold(value)}`;
      })
      .join("\n");
  }

  renderSection(title: string, content: string): string {
    return `${chalk.cyan.bold(title)}\n${content}`;
  }

  renderHeader(text: string): string {
    const line = "═".repeat(text.length);
    return `\n${chalk.bold(text)}\n${chalk.dim(line)}\n`;
  }

  renderList(items: string[], bullet = "•"): string {
    return items.map((item) => `  ${chalk.dim(bullet)} ${item}`).join("\n");
  }

  renderWarning(message: string): string {
    return chalk.yellow(`⚠️  ${message}`);
  }

  renderSuccess(message: string): string {
    return chalk.green(`✅ ${message}`);
  }

  renderError(message: string): string {
    return chalk.red(`❌ ${message}`);
  }

  renderInfo(message: string): string {
    return chalk.blue(`ℹ️  ${message}`);
  }
}

// Singleton instance
export const formatService = new FormatService();
