# MCP Server Integration

## Installation

### OpenCode Integration

Add to your OpenCode configuration:

```json
{
  "mcpServers": {
    "ocsight": {
      "command": "npx",
      "args": ["ocsight", "mcp"]
    }
  }
}
```

### Manual Testing

```bash
# Install globally
npm install -g ocsight

# Start MCP server
ocsight mcp

# Or run with npx
npx ocsight mcp
```

## Available Tools

- `list_providers`: List all AI providers found in OpenCode data
- `get_tool_usage`: Get usage statistics for specific tools
- `get_daily_stats`: Get daily activity statistics
- `analyze_project`: Analyze specific project usage patterns

## Configuration

The MCP server automatically detects OpenCode data location:

- Default: `~/.local/share/opencode/storage/`
- Can be overridden with environment variable: `OPENCODE_DATA_DIR`

## Troubleshooting

1. **Server not starting**: Ensure OpenCode data directory exists
2. **Tools not available**: Check OpenCode MCP server configuration
3. **Permission errors**: Ensure read access to OpenCode data directory
