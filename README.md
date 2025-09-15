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
- **Caching**: File-based caching with SHA256 validation
- **Streaming**: Memory-efficient processing for large datasets
- **Exports**: JSON, CSV, Markdown reports
- **MCP Server**: Real-time analytics via Model Context Protocol
- **Filtering**: By time, provider, model, project
- **Cross-Platform**: Go binaries for macOS, Linux, and Windows

## Commands

### Analysis

```bash
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
# Detailed stats
ocsight stats

# Time-filtered stats
ocsight stats --days 30
```

### Export

```bash
# CSV export (default)
ocsight export --days 7

# JSON export
ocsight export --format json --output data.json

# Markdown reports
ocsight export --format markdown --output report.md
```

## Installation

### Prerequisites

- Node.js >=18.0.0 (ES modules support required)
- OpenCode installed with data in `~/.local/share/opencode/storage/`

### Option 1: Homebrew (Recommended)

```bash
# Install from homebrew tap
brew install heyhuynhgiabuu/tap/ocsight
```

### Option 2: npm

```bash
# Install globally
npm install -g ocsight
```

### Option 3: From Source

```bash
# Clone and install
git clone https://github.com/heyhuynhgiabuu/ocsight.git
cd ocsight
bun install

# Build and run
bun run build
ocsight analyze --days 7
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

## Examples

### Basic Analysis Output

```bash
$ ocsight analyze --days 7

📊 OpenCode Analysis

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
- Applies caching and streaming
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

```bash
# Development
bun run dev analyze --days 7

# Build
bun run build

# Test
bun test

# MCP server
bun run src/mcp/server.ts
```

### Tech Stack

- **Runtime**: Bun + TypeScript (ES modules)
- **CLI**: Commander.js
- **MCP**: Model Context Protocol SDK
- **Styling**: Chalk + ora (v8+ ES module)
- **Export**: csv-writer + custom templates
- **Validation**: Zod

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test with real OpenCode data
4. Submit a pull request

## License

MIT
