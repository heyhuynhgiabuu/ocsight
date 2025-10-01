---
title: CLI Commands
description: Complete reference for all ocsight CLI commands
---

Complete reference for all available ocsight CLI commands.

## Core Commands

### summary

Unified usage summary and analysis

```bash
ocsight summary              # Quick overview
ocsight summary --detailed   # Full analysis
ocsight summary --days 30    # Last 30 days
ocsight summary --provider anthropic  # Filter by provider
```

### sessions

Session management and exploration

```bash
ocsight sessions list        # List all sessions
ocsight sessions list --recent  # Recent sessions only
ocsight sessions show ses_123   # View specific session
ocsight sessions top --cost     # Top sessions by cost
ocsight sessions top --tokens   # Top sessions by tokens
```

### costs

Cost analysis and spending tracking

```bash
ocsight costs                # Last 7 days (default)
ocsight costs today          # Today's costs only
ocsight costs --days 30      # Last 30 days
ocsight costs --provider anthropic  # Filter by provider
ocsight costs --alert 100    # Alert if daily cost > $100
```

### live

Real-time monitoring dashboard

```bash
ocsight live                 # Monitor active session
ocsight live --session ses_123  # Monitor specific session
ocsight live --refresh 5     # Custom refresh interval
```

### export

Export data to various formats

```bash
ocsight export               # JSON format (default)
ocsight export --format csv  # Export to CSV
ocsight export --format markdown  # Export to Markdown
ocsight export --days 7      # Export last 7 days
ocsight export --output report.json  # Custom output file
```

### models

Browse and compare AI model pricing

```bash
ocsight models list          # List all models
ocsight models show "anthropic/claude-3.5"  # Show model details
ocsight models compare "openai/gpt-4o" "anthropic/claude-3.5"  # Compare models
ocsight models providers     # List all providers
```

### config

Configuration management

```bash
ocsight config show          # Show current configuration
ocsight config init          # Initialize configuration
ocsight config doctor        # Validate configuration
```

### budget

Budget limits and cost tracking

```bash
ocsight budget status        # Show current month budget status
ocsight budget set 1000      # Set global monthly budget limit
ocsight budget show          # Show configured budget limits
ocsight budget add anthropic 500  # Add budget limit for provider
ocsight budget forecast      # Project end-of-month costs
```

## Global Options

All commands support these flags:

```bash
--help     # Show help for command
--version  # Show version
--quiet    # Minimal output
--verbose  # Detailed output
```

## Getting Help

```bash
ocsight help                # Show all commands
ocsight <command> --help    # Help for specific command
```
