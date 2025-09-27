---
title: summary
description: Unified usage summary and analysis
---

The `summary` command provides a comprehensive overview of your OpenCode usage.

## Basic Usage

```bash
# Quick overview
ocsight summary

# Detailed analysis
ocsight summary --detailed

# Last 30 days
ocsight summary --days 30

# Filter by provider
ocsight summary --provider anthropic
```

## Options

- `--detailed` - Show extended analysis including top sessions and trends
- `--days <number>` - Filter to last N days
- `--provider <provider>` - Filter by specific provider
- `--start <date>` - Start date (YYYY-MM-DD)
- `--end <date>` - End date (YYYY-MM-DD)
- `--format <format>` - Output format: text or json
- `--quiet` - Minimal output

## Output Sections

### Overview
- Total sessions, messages, cost, and tokens
- Average cost and tokens per session

### Provider Breakdown
- Sessions, costs, and tokens by provider
- Percentage of total usage

### Recent Activity
- Daily costs and usage for the last 7 days
- Session counts and token usage

### Cost Insights (when applicable)
- Recommendations for cost optimization
- Alerts for unusual spending patterns
- Provider consolidation suggestions

## Examples

### Basic summary
```bash
$ ocsight summary

📊 Usage Summary
════════════════

Overview
Sessions          │ 787
Total Cost        │ $8,736.43
Total Tokens      │ 2,949,563,969
Avg Cost/Session  │ $11.10
```

### Filtered by provider
```bash
$ ocsight summary --provider anthropic --days 7

📊 Usage Summary
════════════════

Overview
Sessions          │ 26
Total Cost        │ $8,237.66
Total Tokens      │ 699,650,136
```

### JSON output for automation
```bash
$ ocsight summary --format json | jq '.summary.byProvider'
[
  {
    "provider": "anthropic",
    "sessions": 26,
    "costCents": 823766,
    "tokens": 699650136,
    "percentage": 98.6
  }
]
```