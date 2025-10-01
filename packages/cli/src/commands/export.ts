import { Command } from "commander";

import { createObjectCsvWriter } from "csv-writer";
import { dataService } from "../services/data.js";
import { costService } from "../services/cost.js";
import { formatService } from "../services/format.js";
import { getExportSummary } from "../lib/safe-export.js";
import chalk from "chalk";

interface ExportOptions {
  days?: number;
  start?: string;
  end?: string;
  provider?: string;
  format?: "csv" | "json" | "markdown";
  output?: string;
  session?: string;
}

export const exportCommand = new Command("export")
  .description("Export OpenCode usage data")
  .option("-d, --days <days>", "Include data from last N days", parseInt)
  .option("-s, --start <date>", "Start date (YYYY-MM-DD)")
  .option("-e, --end <date>", "End date (YYYY-MM-DD)")
  .option("--provider <provider>", "Filter by provider")
  .option("--session <id>", "Export specific session")
  .option(
    "-f, --format <format>",
    "Export format (csv, json, markdown)",
    "json",
  )
  .option("-o, --output <file>", "Output file path")
  .action(async (options: ExportOptions) => {
    try {
      console.log("Loading OpenCode data...");

      // Load sessions with filters
      const sessions = await dataService.loadSessions({
        days: options.days,
        provider: options.provider,
        session: options.session,
        quiet: true,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(
          formatService.renderWarning(
            "No sessions found with the specified filters",
          ),
        );
        return;
      }

      // Generate output filename if not provided
      if (!options.output) {
        const timestamp = new Date().toISOString().split("T")[0];
        const ext = options.format || "json";
        options.output = `ocsight-export-${timestamp}.${ext}`;
      }

      console.log(
        `Exporting ${sessions.length} sessions to ${options.format?.toUpperCase()}...`,
      );

      // Export based on format
      switch (options.format) {
        case "csv":
          await exportToCsv(sessions, options.output);
          break;
        case "markdown":
          await exportToMarkdown(sessions, options.output);
          break;
        case "json":
        default:
          await exportToJson(sessions, options.output);
          break;
      }

      // Show export summary
      const summary = await getExportSummary(options.output);
      console.log(formatService.renderSuccess(`Export completed successfully`));
      console.log(chalk.cyan(`📁 File: ${summary.file_path}`));
      console.log(
        chalk.dim(`   Size: ${summary.file_size} (${summary.format})`),
      );
      console.log(chalk.dim(`   Records: ${sessions.length.toLocaleString()}`));
    } catch (error) {
      console.error(formatService.renderError("Export failed"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

async function exportToJson(
  sessions: any[],
  outputPath: string,
): Promise<void> {
  // Calculate aggregates
  const costSummary = await costService.aggregateCosts(sessions);
  const dailyCosts = costService.getDailyCosts(sessions);

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      totalCost: costService.formatCostInDollars(costSummary.totalCostCents),
      totalTokens: costSummary.totalTokens,
    },
    summary: {
      byProvider: costService.getProviderBreakdown(costSummary),
      dailyCosts: dailyCosts.slice(0, 30),
      insights: costService.getCostInsights(costSummary),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title || "Untitled",
      created: new Date(s.time.created).toISOString(),
      updated: s.time.updated ? new Date(s.time.updated).toISOString() : null,
      provider: s.model.provider,
      model: s.model.model,
      messages: s.messages.length,
      tokensUsed: s.tokens_used || 0,
      costCents: s.cost_cents,
      duration: s.time.updated
        ? Math.round((s.time.updated - s.time.created) / 60000)
        : 0,
    })),
  };

  await Bun.write(outputPath, JSON.stringify(exportData, null, 2));
}

async function exportToCsv(sessions: any[], outputPath: string): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: "date", title: "Date" },
      { id: "sessionId", title: "Session ID" },
      { id: "title", title: "Title" },
      { id: "provider", title: "Provider" },
      { id: "model", title: "Model" },
      { id: "messages", title: "Messages" },
      { id: "tokensUsed", title: "Tokens" },
      { id: "costDollars", title: "Cost ($)" },
      { id: "duration", title: "Duration (min)" },
    ],
  });

  const csvData = sessions.map((session) => ({
    date: new Date(session.time.created).toISOString().split("T")[0],
    sessionId: session.id,
    title: session.title || "Untitled",
    provider: session.model.provider,
    model: session.model.model,
    messages: session.messages.length,
    tokensUsed: session.tokens_used || 0,
    costDollars: (session.cost_cents / 100).toFixed(2),
    duration: session.time.updated
      ? Math.round((session.time.updated - session.time.created) / 60000)
      : 0,
  }));

  await csvWriter.writeRecords(csvData);
}

async function exportToMarkdown(
  sessions: any[],
  outputPath: string,
): Promise<void> {
  const costSummary = await costService.aggregateCosts(sessions);
  const dailyCosts = costService.getDailyCosts(sessions);
  const providerBreakdown = costService.getProviderBreakdown(costSummary);

  let markdown = `# OCsight Export Report\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n`;
  markdown += `**Sessions:** ${sessions.length}\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Cost:** ${formatService.formatCurrency(costSummary.totalCostCents)}\n`;
  markdown += `- **Total Tokens:** ${formatService.formatNumber(costSummary.totalTokens)}\n`;
  markdown += `- **Average Cost/Session:** ${formatService.formatCurrency(costSummary.averageCostPerSession)}\n`;
  markdown += `- **Total Messages:** ${sessions.reduce((sum, s) => sum + s.messages.length, 0).toLocaleString()}\n\n`;

  // Provider breakdown
  if (providerBreakdown.length > 0) {
    markdown += `## Providers\n\n`;
    markdown += `| Provider | Sessions | Cost | Tokens | % |\n`;
    markdown += `|----------|----------|------|--------|---|\n`;
    providerBreakdown.forEach((p) => {
      markdown += `| ${p.provider} | ${p.sessions} | ${formatService.formatCurrency(p.costCents)} | ${formatService.formatNumber(p.tokens)} | ${p.percentage.toFixed(1)}% |\n`;
    });
    markdown += `\n`;
  }

  // Recent activity
  if (dailyCosts.length > 0) {
    markdown += `## Daily Activity (Last 7 Days)\n\n`;
    markdown += `| Date | Sessions | Cost | Tokens |\n`;
    markdown += `|------|----------|------|--------|\n`;
    dailyCosts.slice(0, 7).forEach((d) => {
      markdown += `| ${d.date} | ${d.sessions} | ${formatService.formatCurrency(d.costCents)} | ${formatService.formatNumber(d.tokens)} |\n`;
    });
    markdown += `\n`;
  }

  // Top 10 sessions by cost
  const topSessions = dataService.getTopSessionsByCost(sessions, 10);
  if (topSessions.length > 0) {
    markdown += `## Top Sessions by Cost\n\n`;
    markdown += `| Session ID | Date | Provider | Cost | Tokens |\n`;
    markdown += `|------------|------|----------|------|--------|\n`;
    topSessions.forEach((s) => {
      markdown += `| ${s.id.substring(0, 12)} | ${formatService.formatDate(s.time.created)} | ${s.model.provider} | ${formatService.formatCurrency(s.cost_cents)} | ${formatService.formatNumber(s.tokens_used || 0)} |\n`;
    });
    markdown += `\n`;
  }

  await Bun.write(outputPath, markdown);
}
