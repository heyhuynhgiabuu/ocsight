# ocusage

OpenCode Usage Analytics - Simple CLI tool to analyze OpenCode usage from local JSON files.

## Quick Start

```bash
# Install dependencies
bun install

# Build CLI
bun run build

# Analyze OpenCode usage (auto-detects OpenCode directory)
node dist/index.js analyze

# Or use npm start for dev mode
bun run dev analyze

# Test with real data
node dist/index.js analyze --days 7
```

## Features

- **Simple CLI**: Like ccusage for Claude Code, but for OpenCode
- **Real OpenCode Data**: Reads OpenCode's actual session and message storage
- **Usage Statistics**: Session counts, tool usage patterns, cost estimates
- **Beautiful Output**: Colorful terminal output with clear metrics
- **Fast**: Built with TypeScript and optimized data loading
- **Multiple Export Formats**: JSON, CSV
- **Flexible Filtering**: By time, project, provider
- **Auto-Detection**: Automatically finds OpenCode data directory

## Commands

### Basic Usage

```bash
# Analyze OpenCode usage (auto-detects ~/.local/share/opencode)
node dist/index.js analyze

# Filter by time period
node dist/index.js analyze --days 7
node dist/index.js analyze --days 30

# Filter by date range
node dist/index.js analyze --start 2025-09-01 --end 2025-09-14

# Filter by project or provider
node dist/index.js analyze --project "my-project"
node dist/index.js analyze --provider anthropic
```

### Detailed Statistics

```bash
# Show detailed statistics
node dist/index.js stats

# Filter statistics by time period
node dist/index.js stats --days 7
node dist/index.js stats --start 2025-09-01
```

### Export Data

```bash
# Export as CSV (default)
node dist/index.js export --days 7

# Export as JSON
node dist/index.js export --format json --days 7

# Specify output file
node dist/index.js export --format csv --output my-usage.csv

# Export all data
node dist/index.js export --format json --output complete-data.json
```

## Installation

### Global Installation

```bash
# Install dependencies and build
bun install
bun run build

# Install globally
npm install -g .

# Then use directly
ocusage analyze --days 7
```

### Local Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev analyze --days 7

# Build for production
bun run build

# Run production build
node dist/index.js analyze
```

## OpenCode Data Structure

The CLI reads from OpenCode's actual storage structure:

**Location:** `~/.local/share/opencode/storage/`

### Storage Structure

```
~/.local/share/opencode/storage/
├── session/
│   └── <project-hash>/
│       ├── ses_abc123.json  # Session metadata
│       └── ses_def456.json
└── message/
    └── <session-id>/
        ├── msg_xyz789.json  # Individual messages
        └── msg_abc123.json
```

### Session Metadata Format

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

## Examples

### Basic Analysis

```bash
$ node dist/index.js analyze --days 7

📊 OpenCode Usage Analysis

Overview:
  Sessions: 5
  Messages: 1,000
  Tools used: 0
  Total cost: $0.00
  Total tokens: 0

By Provider:
  unknown: 5 sessions, $0.00, 0 tokens

Recent Activity (Last 7 Days):
  2025-09-14: 1 sessions, $0.00
  2025-09-13: 4 sessions, $0.00
```

### Export Data

```bash
$ node dist/index.js export --format csv --days 7
✔ Data exported to opencode-export-2025-09-14.csv

$ head opencode-export-2025-09-14.csv
Date,Session ID,Session Title,Provider,Model,Tokens Used,Cost (Cents),Tools Used,Duration (Minutes)
2025-09-14,ses_6b75f1ac3ffeKDim6pVrdeRX9m,Continuing properly,unknown,unknown,0,0,,57
2025-09-13,ses_6bb14678bffeGmfLLCBqIQICMZ,Migrating API endpoints,unknown,unknown,0,0,,1024
```

## Development

- **Runtime**: Bun + TypeScript
- **CLI Framework**: Commander.js
- **Styling**: Chalk for colors + ora spinners
- **Export**: csv-writer for CSV generation
- **Total Lines**: ~600 (well under 1000 limit)

## Architecture

The CLI reconstructs OpenCode sessions by:

1. **Session Discovery**: Finds session metadata files in `storage/session/`
2. **Message Loading**: Loads corresponding messages from `storage/message/`
3. **Data Reconstruction**: Combines metadata + messages into complete sessions
4. **Analysis**: Calculates statistics and applies filters
5. **Output**: Formats data for terminal display or export

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real OpenCode data
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
