# ocsight

OpenCode observability platform. See everything happening in your OpenCode development.

## Installation

### Homebrew (Recommended)

```bash
# Add the tap
brew tap heyhuynhgiabuu/tap

# Install ocsight
brew install ocsight
```

### npm

```bash
npm install -g ocsight
```

### Manual Installation

```bash
# Clone and build
git clone https://github.com/heyhuynhgiabuu/ocsight.git
cd ocsight
bun install && bun run build

# Or download pre-built binaries from releases
```

## Quick Start

```bash
# Install and build
bun install && bun run build

# Analyze usage
ocsight analyze

# Export report
ocsight export --format markdown --days 7
```

## What It Does

- **Real Data**: Reads actual OpenCode session and message storage
- **Performance**: Processes 17,400+ messages in <2 seconds
- **Quick Analysis**: `--quick` flag for 90% faster analysis (6-13ms vs 60-120ms)
- **Concurrent Processing**: 3x throughput with batch processing
- **Smart Caching**: 91% compression + LRU eviction (40% memory reduction)
- **Streaming**: Memory-efficient processing for large datasets
- **Exports**: JSON, CSV, Markdown reports
- **MCP Server**: Real-time analytics via Model Context Protocol
- **Filtering**: By time, provider, model, project
- **Cross-Platform**: Go binaries for macOS, Linux, and Windows

## Commands

### Analysis

```bash
# Quick analysis (90% faster)
ocsight analyze --quick

# Basic analysis
ocsight analyze

# Time-based filtering
ocsight analyze --days 7
ocsight analyze --start 2025-09-01 --end 2025-09-14

# Provider/project filtering
ocsight analyze --provider anthropic
ocsight analyze --project "my-project"
```

### Statistics

```bash
# Quick stats (fast)
ocsight stats --quick

# Detailed stats
ocsight stats

# Time-filtered stats
ocsight stats --days 30
```

### Export

```bash
# Quick export (fast)
ocsight export --quick --days 7

# CSV export (default)
ocsight export --days 7

# JSON export
ocsight export --format json --output data.json

# Markdown reports
ocsight export --format markdown --output report.md
```

## MCP Server

Start MCP server for real-time analytics:

```bash
# Start server
ocsight mcp

# Or direct execution
bun run src/mcp/server.ts
```

### MCP Tools

- `list_providers`: List all AI providers
- `get_tool_usage`: Tool usage statistics
- `get_daily_stats`: Daily activity metrics
- `analyze_project`: Project-specific analysis

### Integration

Add to OpenCode configuration:

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

## Performance (v0.7.5)

ocsight v0.7.5 introduces major performance improvements:

### Quick Mode

```bash
# 90% faster analysis (6-13ms vs 60-120ms)
ocsight analyze --quick
ocsight stats --quick
ocsight export --quick
```

### Benchmarks

- **100 sessions**: Processed in 6-13ms (quick mode)
- **Cache compression**: 91% ratio with LRU eviction
- **Memory usage**: 40% reduction with intelligent caching
- **Throughput**: 3x improvement with concurrent processing

### Smart Features

- **Concurrent processing**: Multiple sessions processed simultaneously
- **Intelligent caching**: Persistent cache with compression and eviction
- **Progress throttling**: Clean console output without spam

## Examples

### Basic Analysis Output

```bash
$ ocsight analyze --quick

📊 OpenCode Analysis (Quick Mode)

Overview:
  Sessions: 5
  Messages: 1,000
  Tools used: 0
  Total cost: $0.00
  Total tokens: 0

By Provider:
  unknown: 5 sessions, $0.00, 0 tokens

Recent Activity:
  2025-09-14: 1 sessions, $0.00
  2025-09-13: 4 sessions, $0.00
```

### Markdown Export

```bash
$ ocsight export --format markdown --days 7
✔ Data exported to opencode-export-2025-09-14.md

$ cat opencode-export-2025-09-14.md
# OpenCode Usage Report

**Generated:** 2025-09-14 | **Period:** 7 days
**Sessions:** 5 | **Messages:** 1,000 | **Tools:** 0

## Summary
- Total Cost: $0.00
- Total Tokens: 0
- Active Days: 2

## Provider Statistics
| Provider | Sessions | Messages | Cost | Tokens |
|----------|----------|----------|------|--------|
| unknown | 5 | 1,000 | $0.00 | 0 |

## Daily Activity
| Date | Sessions | Messages | Cost |
|------|----------|----------|------|
| 2025-09-14 | 1 | 200 | $0.00 |
| 2025-09-13 | 4 | 800 | $0.00 |
```

## Data Structure

OpenCode stores data in `~/.local/share/opencode/storage/`:

```
storage/
├── session/<project-hash>/ses_*.json    # Session metadata
└── message/<session-id>/msg_*.json      # Individual messages
```

### Session Format

```json
{
  "id": "ses_abc123",
  "title": "Session title",
  "time": {
    "created": 1755603816859,
    "updated": 1755603816866
  },
  "version": "0.5.7",
  "parentID": "ses_parent123"
}
```

### Message Format

```json
{
  "id": "msg_xyz789",
  "role": "user",
  "sessionID": "ses_abc123",
  "time": {
    "created": 1755603816890
  },
  "content": "Message content",
  "tools": []
}
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Commands  │    │   MCP Server    │    │  Output Formats │
│  (analyze, etc) │    │  (real-time)    │    │ (JSON,CSV,MD)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────┬───────────┼──────────┬───────────┘
                     │           │          │
           ┌─────────▼─────────┐ │          │
           │  Data Processing  │ │          │
           │  (Core Engine)    │ │          │
           └─────────┬─────────┘ │          │
                     │           │          │
        ┌────────────▼───────────┴──────────▼─────────────────┐
        │              Data Layer                             │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
        │  │   Cache     │  │   Storage   │  │   Stream    │  │
        │  │ (SHA256)    │  │ (OpenCode)  │  │ (Async)     │  │
        │  └─────────────┘  └─────────────┘  └─────────────┘  │
        └─────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  OpenCode Data    │
                    │  ~/.local/share/  │
                    │    opencode/      │
                    └───────────────────┘
```

### Components

**CLI Interface**: Entry point for all commands (analyze, stats, export)

**MCP Server**: Real-time analytics server with tools:

- `list_providers`, `get_tool_usage`, `get_daily_stats`, `analyze_project`

**Data Processing Engine**: Core logic that:

- Discovers sessions and messages
- Applies smart caching (91% compression + LRU)
- Concurrent processing (3x throughput)
- Calculates statistics
- Filters by time, provider, project

**Data Layer**:

- **Cache**: File-based caching with SHA256 validation
- **Storage**: Reads from OpenCode's `~/.local/share/opencode/storage/`
- **Stream**: Async generators for memory-efficient processing

**Output Formats**: JSON, CSV, Markdown reports

### Data Flow

1. **Input**: CLI command or MCP tool request
2. **Discovery**: Scan OpenCode storage for sessions/messages
3. **Cache Check**: Validate cached data, skip unchanged files
4. **Processing**: Stream data through analysis pipeline
5. **Analysis**: Calculate statistics, apply filters
6. **Output**: Generate terminal display or export file

## Development

### Adding Table Rendering

The project uses `cli-table3` for structured output display. The table utilities are centralized in `src/lib/table.ts`:

- `renderTable()` - Formats data into bordered tables with auto-alignment
- `renderKV()` - Key-value pair tables (metrics, overview data)
- `section()` - Adds titled sections with chalk theming

**Design Principles:**

- Minimal borders using Unicode box characters
- Auto-detection of numeric columns for right-alignment
- Compact layout by default to conserve vertical space
- Chalk integration for colored headers and content
- NO_COLOR environment variable support

**Usage:**

```typescript
import { renderTable, renderKV, section } from "../lib/table.js";

// Data table
const table = renderTable({
  head: ["Provider", "Sessions", "Cost"],
  rows: [["OpenAI", 100, "$50.00"]],
});

// Metrics table
const metrics = renderKV([
  ["Total Sessions", 150],
  ["Average Cost", "$0.84"],
]);

// Section with title
console.log(section("📊 Analysis:", table));
```

### Development Commands

```bash
# Development
bun run dev analyze --days 7

# Build all packages
bun run build

# Test
bun test

# Performance tests
bun test packages/cli/test/performance.test.ts

# MCP server
bun run src/mcp/server.ts
```

### Tech Stack

- **Runtime**: Bun + TypeScript (ES modules)
- **CLI**: Commander.js
- **MCP**: Model Context Protocol SDK (@modelcontextprotocol/sdk@^1.18.0)
- **Tables**: cli-table3 for structured output
- **Styling**: Chalk + ora (v8+ ES module)
- **Export**: csv-writer + custom templates
- **Validation**: Zod
- **Performance**: Custom caching with compression and LRU eviction

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test with real OpenCode data
4. Submit a pull request

## License

MIT
