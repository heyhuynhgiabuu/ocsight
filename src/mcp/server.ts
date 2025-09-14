import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildIndex,
  getStats,
  getSession,
  computeUsageSummary,
  getSessionsArray,
} from "./indexer";

async function main() {
  const server = new McpServer({
    name: "ocsight-mcp",
    version: "0.1.0",
  });

  // Build index on startup
  await buildIndex();

  // Expose aggregated data as MCP resources
  server.registerResource(
    "metrics-summary",
    "ocsight://metrics/summary",
    {
      title: "Global usage summary",
      description: "Totals, provider breakdown, top tools",
      mimeType: "application/json",
    },
    async (uri) => {
      const stats = getStats();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(stats),
          },
        ],
      };
    },
  );

  server.registerResource(
    "session-detail",
    new ResourceTemplate("ocsight://sessions/{id}", { list: undefined }),
    {
      title: "Session detail",
      description: "Detailed session by ID",
    },
    async (uri, variables) => {
      const session = getSession((variables as any).id as string);
      if (!session) return { contents: [] };
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(session),
          },
        ],
      };
    },
  );

  server.registerResource(
    "providers",
    "ocsight://providers",
    {
      title: "Provider breakdown",
      description: "List of all providers with usage statistics",
      mimeType: "application/json",
    },
    async (uri) => {
      const stats = getStats();
      if (!stats) return { contents: [] };

      const providers = Object.entries(stats.sessionsByProvider).map(
        ([provider, count]) => ({
          provider,
          sessions: count,
          tokens: stats.tokensByProvider[provider] || 0,
          cost: stats.costsByProvider[provider] || 0,
        }),
      );

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(providers),
          },
        ],
      };
    },
  );

  // Expose analytical queries as MCP tools
  server.tool(
    "usage_summary",
    "Aggregate usage with optional day and provider filters",
    {
      days: z.number().min(1).max(365).optional(),
      provider: z.string().optional(),
    },
    async ({ days, provider }) => {
      const data = computeUsageSummary({ days, provider });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  );

  server.tool(
    "top_sessions",
    "Get highest usage sessions sorted by tokens or cost",
    {
      limit: z.number().min(1).max(100).default(10),
      sort: z.enum(["tokens", "cost"]).default("tokens"),
    },
    async ({ limit = 10, sort = "tokens" }) => {
      const sessions = getSessionsArray();
      const sorted = sessions
        .sort((a, b) => {
          const aValue = sort === "tokens" ? a.tokens_used : a.cost_cents;
          const bValue = sort === "tokens" ? b.tokens_used : b.cost_cents;
          return bValue - aValue;
        })
        .slice(0, limit)
        .map((s) => ({
          id: s.id,
          title: s.title,
          tokens: s.tokens_used,
          cost_cents: s.cost_cents,
          provider: s.model.provider,
          created_at: s.created_at,
        }));

      return { content: [{ type: "text", text: JSON.stringify(sorted) }] };
    },
  );

  server.tool(
    "refresh_index",
    "Force rebuild of the usage data index",
    {},
    async () => {
      const start = Date.now();
      await buildIndex();
      const duration = Date.now() - start;
      const stats = getStats();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              duration_ms: duration,
              sessions_indexed: stats?.totalSessions || 0,
              messages_processed: stats?.totalMessages || 0,
            }),
          },
        ],
      };
    },
  );

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
