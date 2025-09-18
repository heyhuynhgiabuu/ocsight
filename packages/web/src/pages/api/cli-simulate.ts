import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const command = formData.get("command") as string;

  const responses: Record<string, string> = {
    "ocsight analyze --help": `ocsight analyze
Analyze OpenCode usage data

USAGE:
    ocsight analyze [OPTIONS]

OPTIONS:
    -d, --days <number>        Filter to last N days
        --start <date>         Start date (YYYY-MM-DD)
        --end <date>           End date (YYYY-MM-DD)
        --provider <provider>  Filter by provider (anthropic, openai, etc.)
        --project <project>    Filter by project name
    -h, --help                 Print help information`,
    "ocsight analyze": `📊 OpenCode Usage Analysis
==========================

Period: All data
Total Sessions: 156
Total Messages: 2,847
Total Tools Used: 1,203
Total Tokens: 847,392
Total Cost: $23.47

Provider Breakdown:
  • Anthropic: 89 sessions, 456,231 tokens, $15.23
  • OpenAI: 67 sessions, 391,161 tokens, $8.24

Top Tools Used:
  • read: 234 uses
  • grep: 189 uses
  • edit: 156 uses
  • bash: 98 uses

Peak Usage Hours: 2-4 PM, 9-11 AM
Most Active Project: web-app (45 sessions)`,
    "ocsight stats": `📈 Detailed Usage Statistics
=============================

Cost Optimization:
  • Most expensive session: "Database Migration" ($4.23, 12,456 tokens)
  • Average cost per session: $0.15
  • Average tokens per session: 5,432
  • Most expensive provider: Anthropic (Claude-3-Opus)

Tool Efficiency:
  • Most used tool: read (234 uses, 98% success rate)
  • Fastest tool: grep (avg 45ms)
  • Most reliable tool: edit (99.2% success rate)

Time Patterns:
  • Peak hours: 10 AM (42 sessions), 3 PM (38 sessions)
  • Peak days: Wednesday (28 sessions), Thursday (26 sessions)
  • Weekend usage: 15% of total`,
    "ocsight export --format csv": `✔ Data exported to opencode-export-2025-09-15.csv
Total records: 156 sessions`,
    "ocsight --help": `ocsight 0.1.4
OpenCode ecosystem observability platform - see everything happening in your OpenCode development

USAGE:
    ocsight [COMMAND]

COMMANDS:
    analyze    Analyze OpenCode usage data
    stats      Show detailed statistics about OpenCode usage
    export     Export OpenCode usage data to CSV or JSON
    mcp        Start MCP server for programmatic access
    help       Print this message or the help of the given subcommand(s)`,
  };

  const response =
    responses[command] ||
    `$ ${command}
Command not found. Available commands: analyze, export, stats
Use 'ocsight --help' for more information.`;

  return new Response(
    `<pre class="text-sm bg-muted p-4 overflow-auto">$ <span class="text-primary">${command}</span>
${response}</pre>`,
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  );
};