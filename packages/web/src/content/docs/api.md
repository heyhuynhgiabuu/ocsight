---
title: API Reference
description: Complete API reference for ocsight
---

Complete reference for ocsight APIs and data formats.

### Available References

- [Data Format](./data-format) - Data structures and formats used by ocsight

### Overview

The ocsight CLI provides comprehensive access to all OpenCode usage data and functionality:

- Session data and analytics from OpenCode storage
- Cost calculations using models.dev pricing
- Export functionality (JSON, CSV, Markdown)
- Real-time monitoring capabilities

### Data Sources

ocsight reads directly from OpenCode's local storage:

```
~/.local/share/opencode/storage/
├── session/<project-hash>/ses_*.json    # Session metadata
└── message/<session-id>/msg_*.json      # Individual messages
```

### CLI Integration

Use ocsight commands in scripts and automation:

```bash
# Get JSON output for automation
ocsight summary --format json > usage.json

# Export CSV for analysis
ocsight export --format csv --days 30 > monthly-usage.csv

# Check costs with exit codes
ocsight costs --alert 100 && echo "Budget OK" || echo "Over budget"
```