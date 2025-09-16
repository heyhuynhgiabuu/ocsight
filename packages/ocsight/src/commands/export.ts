import { Command } from "commander";
import { writeFileSync } from "fs";
import { createObjectCsvWriter } from "csv-writer";
import { loadAllData } from "../lib/data.js";
import { filterSessions, calculateStatistics } from "../lib/analysis.js";
import {
  OpenCodeData,
  UsageStatistics,
  OpenCodeSession,
} from "../types/index.js";

export const exportCommand = new Command("export")
  .description("Export OpenCode usage data to CSV or JSON")
  .option("-p, --path <path>", "Custom path to OpenCode data directory")
  .option("-d, --days <days>", "Include data from last N days", parseInt)
  .option("-s, --start <date>", "Start date (YYYY-MM-DD)")
  .option("-e, --end <date>", "End date (YYYY-MM-DD)")
  .option("--provider <provider>", "Filter by provider")
  .option("--project <project>", "Include only this project")
  .option("--exclude-project <project>", "Exclude this project")
  .option("-f, --format <format>", "Export format (csv|json|markdown)", "csv")
  .option("-o, --output <file>", "Output file path")
  .action(async (options) => {
    console.log("Loading OpenCode data...");

    try {
      const data = await loadAllData();
      console.log("Analyzing data...");

      const filteredSessions = filterSessions(data, options);
      const statistics = calculateStatistics(filteredSessions);

      if (!options.output) {
        const timestamp = new Date().toISOString().split("T")[0];
        options.output = `opencode-export-${timestamp}.${options.format}`;
      }

      console.log(`Exporting to ${options.format.toUpperCase()}...`);

      if (options.format === "json") {
        await exportToJson(statistics, data, options.output);
      } else if (options.format === "csv") {
        await exportToCsv(filteredSessions, options.output);
      } else if (options.format === "markdown") {
        await exportToMarkdown(statistics, filteredSessions, options.output);
      }

      console.log(`Data exported to ${options.output}`);
    } catch (error) {
      console.error("Export failed");
      console.error("Error:", error);
      process.exit(1);
    }
  });

async function exportToJson(
  statistics: UsageStatistics,
  data: OpenCodeData,
  outputPath: string,
): Promise<void> {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      totalSessions: statistics.totalSessions,
    },
    statistics,
    rawData: data,
  };

  writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
}

async function exportToCsv(
  sessions: OpenCodeSession[],
  outputPath: string,
): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: "date", title: "Date" },
      { id: "sessionId", title: "Session ID" },
      { id: "sessionTitle", title: "Session Title" },
      { id: "provider", title: "Provider" },
      { id: "model", title: "Model" },
      { id: "tokensUsed", title: "Tokens Used" },
      { id: "costCents", title: "Cost (Cents)" },
      { id: "toolsUsed", title: "Tools Used" },
      { id: "sessionDuration", title: "Duration (Minutes)" },
    ],
  });

  const csvData = sessions.map((session) => {
    const duration =
      session.updated_at && session.created_at
        ? Math.round(
            (new Date(session.updated_at).getTime() -
              new Date(session.created_at).getTime()) /
              60000,
          )
        : 0;

    const tools =
      session.messages?.flatMap(
        (msg) => msg.tools?.map((tool) => tool.name) || [],
      ) || [];

    return {
      date: new Date(session.created_at).toISOString().split("T")[0],
      sessionId: session.id,
      sessionTitle: session.title || "Untitled",
      provider: session.model?.provider || "unknown",
      model: session.model?.model || "unknown",
      tokensUsed: session.tokens_used || 0,
      costCents: session.cost_cents || 0,
      toolsUsed: tools.join(", "),
      sessionDuration: duration,
    };
  });

  await csvWriter.writeRecords(csvData);
}

async function exportToMarkdown(
  statistics: UsageStatistics,
  sessions: OpenCodeSession[],
  outputPath: string,
): Promise<void> {
  const markdown = generateMarkdownReport(statistics, sessions);
  writeFileSync(outputPath, markdown);
}

function generateMarkdownReport(
  statistics: UsageStatistics,
  sessions: OpenCodeSession[],
): string {
  const reportDate = new Date().toISOString().split("T")[0];

  let markdown = `# OpenCode Usage Report\n\n`;
  markdown += `**Generated:** ${reportDate}\n`;
  markdown += `**Period:** ${formatDateRange(sessions)}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Total Sessions:** ${statistics.totalSessions}\n`;
  markdown += `- **Total Messages:** ${statistics.totalMessages}\n`;
  markdown += `- **Total Tools:** ${statistics.totalTools}\n`;
  markdown += `- **Total Tokens:** ${statistics.totalTokens.toLocaleString()}\n`;
  markdown += `- **Total Cost:** $${(statistics.totalCostCents / 100).toFixed(2)}\n\n`;

  const topTools = Object.entries(statistics.toolUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  if (topTools.length > 0) {
    markdown += `## Top Tools Used\n\n`;
    markdown += `| Tool | Usage Count |\n`;
    markdown += `|------|-------------|\n`;
    topTools.forEach((tool) => {
      markdown += `| ${tool.name} | ${tool.count} |\n`;
    });
    markdown += `\n`;
  }

  const providerStats = Object.entries(statistics.sessionsByProvider).map(
    ([provider, sessions]) => ({
      provider,
      sessions,
      tokens: statistics.tokensByProvider[provider] || 0,
      costCents: statistics.costsByProvider[provider] || 0,
    }),
  );

  if (providerStats.length > 0) {
    markdown += `## Provider Statistics\n\n`;
    markdown += `| Provider | Sessions | Tokens | Cost |\n`;
    markdown += `|----------|----------|--------|------|\n`;
    providerStats.forEach((provider) => {
      markdown += `| ${provider.provider} | ${provider.sessions} | ${provider.tokens.toLocaleString()} | $${(provider.costCents / 100).toFixed(2)} |\n`;
    });
    markdown += `\n`;
  }

  const dailyStatsArray = Object.entries(statistics.dailyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, stats]) => ({ date, ...stats }));

  if (dailyStatsArray.length > 0) {
    markdown += `## Daily Activity\n\n`;
    markdown += `| Date | Sessions | Tokens | Cost |\n`;
    markdown += `|------|----------|--------|------|\n`;
    dailyStatsArray.slice(0, 14).forEach((day) => {
      markdown += `| ${day.date} | ${day.sessions} | ${day.tokens.toLocaleString()} | $${(day.cost / 100).toFixed(2)} |\n`;
    });
    markdown += `\n`;
  }

  if (sessions.length > 0) {
    markdown += `## Recent Sessions\n\n`;
    markdown += `| Date | Title | Provider | Model | Duration | Tools |\n`;
    markdown += `|------|-------|----------|-------|----------|-------|\n`;
    sessions.slice(0, 20).forEach((session) => {
      const duration =
        session.updated_at && session.created_at
          ? Math.round(
              (new Date(session.updated_at).getTime() -
                new Date(session.created_at).getTime()) /
                60000,
            )
          : 0;
      const tools =
        session.messages?.flatMap(
          (msg) => msg.tools?.map((tool) => tool.name) || [],
        ) || [];
      markdown += `| ${new Date(session.created_at).toISOString().split("T")[0]} | ${session.title || "Untitled"} | ${session.model?.provider || "unknown"} | ${session.model?.model || "unknown"} | ${duration}min | ${tools.slice(0, 3).join(", ")}${tools.length > 3 ? "..." : ""} |\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

function formatDateRange(sessions: OpenCodeSession[]): string {
  if (sessions.length === 0) return "No data";

  const dates = sessions.map(
    (s) => new Date(s.created_at).toISOString().split("T")[0],
  );
  const minDate = Math.min(...dates.map((d) => new Date(d).getTime()));
  const maxDate = Math.max(...dates.map((d) => new Date(d).getTime()));

  const min = new Date(minDate).toISOString().split("T")[0];
  const max = new Date(maxDate).toISOString().split("T")[0];

  return min === max ? min : `${min} to ${max}`;
}
