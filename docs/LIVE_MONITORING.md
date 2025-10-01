# Live Monitoring Guide

Watch your OpenCode costs accumulate in real-time.

## Quick Start

```bash
# Monitor current session
ocsight live

# Monitor specific session
ocsight live --session ses_123abc

# Update every 5 seconds
ocsight live --refresh 5
```

## Live Display

The live monitor shows:

- **Active Sessions**: Current OpenCode sessions
- **Cost Accumulation**: Real-time cost updates
- **Token Usage**: Input/output tokens per session
- **Budget Status**: Current spending vs limits

## Example Output

```
🔴 Live Monitor - Refreshing every 3s

Active Sessions: 2
┌─────────────────┬──────────┬──────────┬─────────────┐
│ Session         │ Cost     │ Tokens   │ Provider    │
├─────────────────┼──────────┼──────────┼─────────────┤
│ ses_abc123      │ $12.34   │ 45.2K    │ anthropic   │
│ ses_def456      │ $8.91    │ 32.1K    │ openai      │
└─────────────────┴──────────┴──────────┴─────────────┘

Today's Spending: $21.25 / $200.00 (10.6%)
Budget Status: 🟢 On Track
```

## Options

### Refresh Rate

```bash
ocsight live --refresh 1    # Update every second
ocsight live --refresh 10   # Update every 10 seconds
```

### Specific Session

```bash
ocsight live --session ses_abc123
```

### Hide Progress

```bash
ocsight live --no-progress
```

## Performance

- Optimized for minimal CPU usage
- Efficient file watching
- Smart caching reduces I/O
- Handles 100+ concurrent sessions

## Integration

Live monitoring works with:

- Budget alerts
- Cost tracking
- Session management
- All providers
