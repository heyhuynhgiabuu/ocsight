---
title: sessions
description: Session management and exploration
---

The `sessions` command provides tools for exploring and analyzing individual OpenCode sessions.

## Subcommands

### list
List sessions with filtering and sorting options

```bash
# List all sessions
ocsight sessions list

# Show only recent sessions
ocsight sessions list --recent

# Filter by provider
ocsight sessions list --provider anthropic

# Sort by different criteria
ocsight sessions list --sort cost
ocsight sessions list --sort tokens
ocsight sessions list --sort date
```

### show
Display detailed information about a specific session

```bash
# Show session details
ocsight sessions show ses_123

# Include token breakdown
ocsight sessions show ses_123 --tokens
```

### top
Show the most expensive or token-intensive sessions

```bash
# Top 10 sessions by cost (default)
ocsight sessions top --cost

# Top 10 sessions by tokens
ocsight sessions top --tokens

# Custom limit
ocsight sessions top --cost --limit 20
```

## Options

### list options
- `--recent` - Show only recent sessions (last 10)
- `--limit <number>` - Maximum number of sessions to display
- `--provider <provider>` - Filter by provider
- `--sort <type>` - Sort by: cost, tokens, date, messages

### show options
- `--tokens` - Include token distribution breakdown

### top options
- `--cost` - Sort by cost (default)
- `--tokens` - Sort by token usage
- `--limit <number>` - Number of sessions to show

## Examples

### List recent sessions
```bash
$ ocsight sessions list --recent

📋 Sessions
═══════════

┌──────────────┬────────────┬──────────┬──────────┬────────────┬───────┐
│ Session ID   │ Date       │ Provider │ Messages │ Tokens     │ Cost  │
├──────────────┼────────────┼──────────┼──────────┼────────────┼───────┤
│ ses_67df26a1 │ 2025-09-25 │ anthropic│ 854      │ 78,183,986 │ $1234 │
│ ses_673a236c │ 2025-09-27 │ github   │ 13       │ 462,858    │ $0.00 │
└──────────────┴────────────┴──────────┴──────────┴────────────┴───────┘
```

### Show session details
```bash
$ ocsight sessions show ses_67df26a1

📄 Session: ses_67df26a1
══════════════════════════

Session Details
Title             │ Code refactoring session
Created           │ 9/25/2025, 2:30:00 PM
Updated           │ 9/25/2025, 4:45:00 PM
Provider          │ anthropic
Model             │ claude-3.5-sonnet
Messages          │ 854
Total Tokens      │ 78,183,986
Cost              │ $1234.56
```

### Top expensive sessions
```bash
$ ocsight sessions top --cost --limit 5

💰 Top 5 Sessions by Cost
═════════════════════════

┌──────┬──────────────┬────────────┬──────────┬───────┬────────────┐
│ Rank │ Session ID   │ Date       │ Provider │ Cost  │ Tokens     │
├──────┼──────────────┼────────────┼──────────┼───────┼────────────┤
│ #1   │ ses_6aee7429 │ 2025-09-16 │ opencode │ $6.71 │ 34,038,339 │
│ #2   │ ses_69f6e94a │ 2025-09-19 │ zai      │ $4.86 │ 33,227,638 │
└──────┴──────────────┴────────────┴──────────┴───────┴────────────┘
```