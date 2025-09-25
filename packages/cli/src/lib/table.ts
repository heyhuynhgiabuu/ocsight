// Using cli-table3 (maintained fork) over cli-table (unmaintained) for:
// - Active maintenance and security fixes
// - Better ESM compatibility with TypeScript
// - Proper alignment and word wrapping support
// - Integration with chalk-colored strings

import Table from "cli-table3";
import chalk from "chalk";

export type Cell = string | number;
export type Row = Cell[];

export function renderTable(params: {
  head: string[];
  rows: Row[];
  align?: Array<"left" | "right" | "center">;
  colWidths?: number[];
  compact?: boolean;
  totals?: Row;
  summary?: Array<[string, Cell]>;
}): string {
  const { head, rows, align, colWidths, compact = true, totals, summary } = params;

  // Auto-detect alignment for numeric columns
  const autoAlign =
    align ||
    head.map((_, i) => {
      const isNumericColumn = rows.every((row) => {
        const cell = row[i];
        return (
          typeof cell === "number" ||
          (typeof cell === "string" && !isNaN(Number(cell)))
        );
      });
      return isNumericColumn ? "right" : "left";
    });

  const tableOptions: any = {
    head,
    style: { head: [], border: [], compact },
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
    colAligns: autoAlign,
  };

  if (colWidths) {
    tableOptions.colWidths = colWidths;
  }

  const table = new Table(tableOptions);

  // Add main data rows
  rows.forEach((row) => table.push(row));
  
  // Add totals row if provided
  if (totals) {
    // Add separator row
    table.push(new Array(head.length).fill(""));
    // Add totals row with bold formatting
    const boldTotals = totals.map((cell, i) => 
      i === 0 ? chalk.bold("TOTALS") : chalk.bold(String(cell))
    );
    table.push(boldTotals);
  }
  
  let result = table.toString();
  
  // Add summary panel if provided
  if (summary && summary.length > 0) {
    const summaryText = summary
      .map(([label, value]) => `${label}: ${chalk.bold(String(value))}`)
      .join("  ");
    result += `\n${chalk.blue(summaryText)}`;
  }
  
  return result;
}

export function renderKV(
  pairs: Array<[string, Cell]>,
  opts?: { align?: Array<"left" | "right" | "center"> },
): string {
  const rows = pairs.map(([key, value]) => [key, value]);
  return renderTable({
    head: ["Metric", "Value"],
    rows,
    align: opts?.align || ["left", "right"],
  });
}

export function section(title: string, body: string): string {
  return `\n${chalk.cyan.bold(title)}\n${body}\n`;
}
