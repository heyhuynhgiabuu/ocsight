# Budget Management Guide

Control your AI spending with ocsight's budget features.

## Quick Setup

```bash
# Set monthly budget
ocsight budget set --monthly 200

# Check current status
ocsight budget status

# Forecast month-end costs
ocsight budget forecast
```

## Budget Commands

### Set Global Budget

```bash
ocsight budget set --monthly 200 --warning 70 --critical 90
```

- `--monthly`: Monthly spending limit
- `--warning`: Alert at 70% (default)
- `--critical`: Alert at 90% (default)

### Add Provider Budget

```bash
ocsight budget add
```

Interactive provider selection from models.dev database.

### Check Status

```bash
ocsight budget status
```

Shows current spending vs budget limits.

### Forecast Costs

```bash
ocsight budget forecast
```

Projects month-end costs based on current spending.

## Budget Alerts

ocsight warns you when:

- Warning threshold reached (default 70%)
- Critical threshold reached (default 90%)
- Projected to exceed budget

## Example Output

```
💰 Budget Status - October 2025

Global Budget: $200.00
Current Spending: $142.59 (71.3%)
Days Remaining: 30

⚠️  Warning: Exceeding warning threshold (70%)
Projected Total: $546.43 (273.2%)
```

## Configuration

Budget settings saved in `ocsight.config.json`:

```json
{
  "budget": {
    "global_monthly_limit": 200,
    "alert_thresholds": {
      "warning": 70,
      "critical": 90
    },
    "providers": {
      "anthropic": {
        "name": "Anthropic",
        "monthly_limit": 150,
        "enabled": true
      }
    }
  }
}
```
