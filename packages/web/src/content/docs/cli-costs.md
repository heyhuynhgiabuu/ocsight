---
title: costs
description: Cost analysis and spending tracking
---

The `costs` command provides focused financial analysis and spending alerts for your OpenCode usage.

## Basic Usage

```bash
# Last 7 days (default)
ocsight costs

# Today's costs only
ocsight costs today

# Last 30 days
ocsight costs --days 30

# Set spending alert
ocsight costs --alert 100
```

## Options

- `--days <number>` - Show costs for last N days
- `--provider <provider>` - Filter by specific provider
- `--alert <amount>` - Alert if daily cost exceeds amount (in dollars)
- `--format <format>` - Output format: text or json

## Subcommands

### today
Quick shortcut to show today's costs

```bash
ocsight costs today
```

## Output Sections

### Summary
- Period covered
- Total cost
- Daily average
- Projected monthly cost

### Daily Costs
- Date-by-date breakdown
- Sessions per day
- Cost and token usage

### Provider Breakdown
- Cost distribution across providers
- Percentage of total spending

### Trend Analysis
- Comparison with previous period
- Spending trend (increasing/decreasing)

### Alerts
- Warnings when daily spending exceeds threshold
- Days that exceeded limits

## Examples

### Basic cost analysis
```bash
$ ocsight costs

💰 Cost Analysis (7 days)
═════════════════════════

Summary
Period            │ 2025-09-21 to 2025-09-27
Total Cost        │ $8,152.29
Sessions          │ 48
Daily Average     │ $1,164.61
Projected Monthly │ $34,938.39
```

### With spending alert
```bash
$ ocsight costs --alert 100

⚠️  ALERT: 3 day(s) exceeded $100 spending limit!
   2025-09-25: $2,259.00 (2159% over)
   2025-09-24: $1,036.64 (937% over)
   2025-09-23: $1,103.11 (1003% over)

💰 Cost Analysis (7 days)
═════════════════════════
[...]
```

### Today's costs
```bash
$ ocsight costs today

💰 Today's Costs
════════════════

Date              │ 2025-09-27
Sessions          │ 2
Total Cost        │ $0.00
Total Tokens      │ 479,454
Average/Session   │ $0.00
```

### Provider-specific costs
```bash
$ ocsight costs --provider anthropic --days 30

💰 anthropic Costs (30 days)
══════════════════════════════

Summary
Period            │ 2025-08-28 to 2025-09-27
Total Cost        │ $8,237.66
Sessions          │ 26
Daily Average     │ $274.59
```

### Trend analysis
```bash
$ ocsight costs --days 7

[...summary...]

Trend
📈 +156% vs previous period

Daily Costs
┌────────────┬──────────┬───────┬─────────────┬─────────────┐
│ Date       │ Sessions │ Cost  │ Tokens      │ Avg/Session │
├────────────┼──────────┼───────┼─────────────┼─────────────┤
│ 2025-09-27 │ 2        │ $0.00 │ 479,454     │ $0.00       │
│ 2025-09-26 │ 6        │ $62.06│ 25,131,491  │ $10.34      │
└────────────┴──────────┴───────┴─────────────┴─────────────┘
```

## JSON Output

For automation and monitoring:

```bash
$ ocsight costs --format json | jq '.dailyCosts[0]'
{
  "date": "2025-09-27",
  "sessions": 2,
  "costCents": 0,
  "tokens": 479454
}
```