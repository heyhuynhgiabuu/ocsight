---
title: Export
description: Export usage data to various formats
order: 3
category: CLI
---

Export your OpenCode usage data to CSV, JSON, or Markdown formats.

### Usage

```bash
ocsight export [OPTIONS]
```

### Options

- `-p, --path <path>`: Custom path to OpenCode data directory
- `-d, --days <number>`: Include data from last N days
- `--start <date>`: Start date (YYYY-MM-DD)
- `--end <date>`: End date (YYYY-MM-DD)
- `--provider <provider>`: Filter by provider
- `--project <project>`: Include only this project
- `--exclude-project <project>`: Exclude this project
- `-f, --format <format>`: Export format (csv|json|markdown)
- `-o, --output <file>`: Output file path
- `-h, --help`: Print help information

### Examples

```bash
ocsight export

ocsight export --format json

ocsight export --format markdown

ocsight export --format csv --output usage-data.csv

ocsight export --days 30

ocsight export --project my-app
```

### Output Formats

## CSV Format

Contains columns: date, provider, model, tokens, cost, project, tool, duration

## JSON Format

Structured data with sessions, messages, and metadata

## Markdown Format

Human-readable report with tables and summaries
