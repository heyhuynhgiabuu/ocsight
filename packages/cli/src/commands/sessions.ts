import { Command } from "commander";
import chalk from "chalk";
import { dataService } from "../services/data.js";
import { costService } from "../services/cost.js";
import { formatService } from "../services/format.js";

interface SessionsListOptions {
  recent?: boolean;
  limit?: number;
  provider?: string;
  sort?: "cost" | "tokens" | "date" | "messages";
}

interface SessionsShowOptions {
  tokens?: boolean;
}

interface SessionsTopOptions {
  cost?: boolean;
  tokens?: boolean;
  limit?: number;
}

export const sessionsCommand = new Command("sessions").description(
  "Session management and exploration",
);

sessionsCommand
  .command("list")
  .description("List sessions")
  .option("-r, --recent", "Show only recent sessions")
  .option(
    "-l, --limit <number>",
    "Maximum number of sessions to show",
    parseInt,
    20,
  )
  .option("-p, --provider <provider>", "Filter by provider")
  .option("-s, --sort <type>", "Sort by: cost, tokens, date, messages", "date")
  .action(async (options: SessionsListOptions) => {
    try {
      const sessions = await dataService.loadSessions({
        provider: options.provider,
        quiet: true,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(formatService.renderWarning("No sessions found"));
        return;
      }

      // Sort sessions
      const sorted = dataService.sortSessions(
        sessions,
        options.sort as any,
        "desc",
      );

      // Limit results
      const limited = options.recent
        ? sorted.slice(0, 10)
        : sorted.slice(0, options.limit || 20);

      // Display table
      const table = formatService.renderTable({
        head: ["Session ID", "Date", "Provider", "Messages", "Tokens", "Cost"],
        rows: limited.map((s) => [
          s.id.substring(0, 12),
          formatService.formatDate(s.time.created),
          s.model.provider,
          formatService.formatNumber(s.messages.length),
          formatService.formatNumber(s.tokens_used || 0),
          formatService.formatCurrency(s.cost_cents),
        ]),
      });

      console.log(formatService.renderHeader("📋 Sessions"));
      console.log(table);
      console.log();
      console.log(
        chalk.dim(`Showing ${limited.length} of ${sessions.length} sessions`),
      );
    } catch (error) {
      console.error(formatService.renderError("Failed to list sessions"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Show subcommand
sessionsCommand
  .command("show <id>")
  .description("Show detailed session information")
  .option("-t, --tokens", "Show token breakdown")
  .action(async (sessionId: string, options: SessionsShowOptions) => {
    try {
      const sessions = await dataService.loadSessions({
        session: sessionId,
        quiet: true,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(
          formatService.renderError(`Session '${sessionId}' not found`),
        );
        return;
      }

      const session = sessions[0];
      const cost = await costService.calculateSessionCost(session);

      console.log(formatService.renderHeader(`📄 Session: ${session.id}`));

      // Basic info
      const basicInfo: Array<[string, any]> = [
        ["Title", session.title || "Untitled"],
        ["Created", new Date(session.time.created).toLocaleString()],
        [
          "Updated",
          session.time.updated
            ? new Date(session.time.updated).toLocaleString()
            : "N/A",
        ],
        ["Provider", session.model.provider],
        ["Model", session.model.model],
        ["Messages", formatService.formatNumber(session.messages.length)],
        ["Total Tokens", formatService.formatNumber(session.tokens_used || 0)],
        ["Cost", formatService.formatCurrency(cost)],
      ];

      console.log(
        formatService.renderSection(
          "Session Details",
          formatService.renderKeyValue(basicInfo),
        ),
      );
      console.log();

      // Token breakdown if requested
      if (options.tokens && session.tokens_used) {
        const tokenBreakdown: Array<[string, any]> = [
          [
            "Input (~70%)",
            formatService.formatNumber(Math.floor(session.tokens_used * 0.7)),
          ],
          [
            "Output (~20%)",
            formatService.formatNumber(Math.floor(session.tokens_used * 0.2)),
          ],
          [
            "Reasoning (~5%)",
            formatService.formatNumber(Math.floor(session.tokens_used * 0.05)),
          ],
          [
            "Cache (~5%)",
            formatService.formatNumber(Math.floor(session.tokens_used * 0.05)),
          ],
        ];

        console.log(
          formatService.renderSection(
            "Token Distribution (Estimated)",
            formatService.renderKeyValue(tokenBreakdown),
          ),
        );
        console.log();
      }

      // Message summary
      const userMessages = session.messages.filter(
        (m) => m.role === "user",
      ).length;
      const assistantMessages = session.messages.filter(
        (m) => m.role === "assistant",
      ).length;

      console.log(
        formatService.renderSection(
          "Messages",
          formatService.renderKeyValue([
            ["User Messages", userMessages],
            ["Assistant Messages", assistantMessages],
            ["Total Messages", session.messages.length],
          ]),
        ),
      );
    } catch (error) {
      console.error(formatService.renderError("Failed to show session"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

// Top subcommand
sessionsCommand
  .command("top")
  .description("Show top sessions by cost or tokens")
  .option("-c, --cost", "Sort by cost (default)")
  .option("-t, --tokens", "Sort by tokens")
  .option("-l, --limit <number>", "Number of sessions to show", parseInt, 10)
  .action(async (options: SessionsTopOptions) => {
    try {
      const sessions = await dataService.loadSessions({
        quiet: true,
        cache: true,
      });

      if (sessions.length === 0) {
        console.log(formatService.renderWarning("No sessions found"));
        return;
      }

      const sortBy = options.tokens ? "tokens" : "cost";
      const limit = options.limit || 10;

      const topSessions =
        sortBy === "cost"
          ? dataService.getTopSessionsByCost(sessions, limit)
          : dataService.getTopSessionsByTokens(sessions, limit);

      const title =
        sortBy === "cost"
          ? `💰 Top ${limit} Sessions by Cost`
          : `📊 Top ${limit} Sessions by Tokens`;

      console.log(formatService.renderHeader(title));

      const table = formatService.renderTable({
        head: ["Rank", "Session ID", "Date", "Provider", "Cost", "Tokens"],
        rows: topSessions.map((s, i) => [
          chalk.bold(`#${i + 1}`),
          s.id.substring(0, 12),
          formatService.formatDate(s.time.created),
          s.model.provider,
          formatService.formatCurrency(s.cost_cents),
          formatService.formatNumber(s.tokens_used || 0),
        ]),
      });

      console.log(table);

      // Summary
      const totalCost = topSessions.reduce((sum, s) => sum + s.cost_cents, 0);
      const totalTokens = topSessions.reduce(
        (sum, s) => sum + (s.tokens_used || 0),
        0,
      );

      console.log();
      console.log(
        formatService.renderSection(
          "Summary",
          formatService.renderKeyValue([
            [
              `Top ${limit} Total Cost`,
              formatService.formatCurrency(totalCost),
            ],
            [
              `Top ${limit} Total Tokens`,
              formatService.formatNumber(totalTokens),
            ],
            [
              "Average Cost",
              formatService.formatCurrency(totalCost / topSessions.length),
            ],
          ]),
        ),
      );
    } catch (error) {
      console.error(formatService.renderError("Failed to get top sessions"));
      console.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
