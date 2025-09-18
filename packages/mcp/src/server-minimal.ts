import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ocsight-mcp",
  version: "0.1.0",
});

server.registerTool(
  "echo",
  {
    title: "Echo Tool",
    description: "Echo back the provided message",
    inputSchema: { message: z.string() },
  },
  async ({ message }) => {
    return { content: [{ type: "text", text: `Echo: ${message}` }] };
  },
);

server.registerResource(
  "test",
  "ocsight://test",
  {
    title: "Test Resource",
    description: "A simple test resource",
    mimeType: "application/json",
  },
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ message: "Hello from OCSight MCP!" }),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log("OCSight MCP server is running...");
