# Budget Management

Control your AI spending with budget limits and alerts.

## Features

- Set global and per-provider monthly budgets
- Real-time spending alerts
- Cost forecasting with conservative estimates
- Interactive provider selection from models.dev

## Quick Start

```bash
# Set $200 monthly budget
ocsight budget set --monthly 200

# Add provider budget
ocsight budget add

# Check current status
ocsight budget status

# Forecast month-end costs
ocsight budget forecast
```

## Commands

### `ocsight budget set`

Set global monthly budget with alert thresholds.

```bash
ocsight budget set --monthly 200 --warning 70 --critical 90
```

### `ocsight budget add`

Interactive provider budget configuration with models.dev integration.

### `ocsight budget status`

Current spending vs budget limits.

### `ocsight budget forecast`

Project month-end costs based on current usage.

### `ocsight budget remove`

Remove provider budget limit.

```bash
ocsight budget remove anthropic
```

## Budget Alerts

ocsight warns you at configurable thresholds:

- **Warning**: Default 70% of budget
- **Critical**: Default 90% of budget
- **Forecast**: Projects month-end overspending

## Smart Forecasting

The budget forecast uses conservative estimates:

- Early month: 30% reduction for variability
- Actual active days calculation
- Real-time spending patterns

Example output:

```
💰 Cost Forecast - October 2025

Current Spending: $142.59
Days Elapsed: 1 / 31
Daily Average: $99.81

⚠️  Early month projection - using conservative estimate
   Based on 1 active day(s) with 30% reduction for variability

Projected Total: $3094.25
Projected Usage: 🔴 1547.1%

⚠️  Warning: Projected to exceed budget by $2894.25
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
        "monthly_limit": 50,
        "enabled": true
      }
    }
  }
}
```
