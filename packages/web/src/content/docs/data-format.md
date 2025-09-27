---
title: Data Format
description: Understanding ocsight data structures and formats
order: 2
category: Reference
---

Complete reference for ocsight data structures, formats, and schemas.

### Core Data Structures

## Session

Represents a single OpenCode conversation session.

```typescript
interface Session {
  id: string;
  project: string;
  provider: string;
  model: string;
  start_time: Date;
  end_time: Date;
  duration_ms: number;
  total_tokens: number;
  total_cost: number;
  message_count: number;
  tool_usage: ToolUsage[];
}
```

## Message

Individual message within a session.

```typescript
interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  tokens_used: number;
  cost: number;
  tool_calls?: ToolCall[];
}
```

## Tool Usage

Tracks usage of individual tools within sessions.

```typescript
interface ToolUsage {
  tool_name: string;
  call_count: number;
  total_tokens: number;
  total_cost: number;
  avg_response_time_ms: number;
  success_rate: number;
}
```

### Export Formats

## CSV Format

Tabular format suitable for spreadsheet analysis.

```csv
date,provider,model,tokens,cost,project,tool,duration_ms,session_id
2025-09-15,anthropic,claude-3-sonnet,1245,0.12,web-app,read,450,session_123
2025-09-15,openai,gpt-4,890,0.08,mobile-app,grep,230,session_124
```

**Columns:**

- `date`: Session date (YYYY-MM-DD)
- `provider`: AI provider (anthropic, openai, etc.)
- `model`: Specific model used
- `tokens`: Total tokens used in session
- `cost`: Total cost in USD
- `project`: Project name
- `tool`: Primary tool used
- `duration_ms`: Session duration in milliseconds
- `session_id`: Unique session identifier

## JSON Format

Structured data for programmatic processing.

```json
{
  "export_info": {
    "version": "0.5.3",
    "generated_at": "2025-09-15T12:00:00Z",
    "total_sessions": 156,
    "date_range": {
      "start": "2025-09-01",
      "end": "2025-09-15"
    },
    "filters_applied": {
      "provider": null,
      "project": null
    }
  },
  "sessions": [
    {
      "id": "session_123",
      "project": "web-app",
      "provider": "anthropic",
      "model": "claude-3-sonnet",
      "start_time": "2025-09-15T10:30:00Z",
      "end_time": "2025-09-15T10:37:30Z",
      "duration_ms": 450000,
      "total_tokens": 1245,
      "total_cost": 0.12,
      "message_count": 8,
      "tool_usage": [
        {
          "tool_name": "read",
          "call_count": 3,
          "total_tokens": 456,
          "total_cost": 0.04,
          "avg_response_time_ms": 120,
          "success_rate": 1.0
        }
      ]
    }
  ]
}
```

## Markdown Format

Human-readable report format.

```markdown
Generated: 2025-09-15

### Summary

- **Period**: 2025-09-01 to 2025-09-15
- **Total Sessions**: 156
- **Total Cost**: $23.47
- **Total Tokens**: 847,392

### Provider Breakdown

| Provider  | Sessions | Tokens  | Cost   |
| --------- | -------- | ------- | ------ |
| Anthropic | 89       | 456,231 | $15.23 |
| OpenAI    | 67       | 391,161 | $8.24  |

### Top Projects

| Project     | Sessions | Cost  |
| ----------- | -------- | ----- |
| web-app     | 45       | $8.92 |
| mobile-app  | 32       | $6.45 |
| api-service | 28       | $4.67 |
```

### Data Storage

ocsight reads data from OpenCode's storage directory:

```
~/.local/share/opencode/storage/
├── session/<project-hash>/ses_*.json    # Session metadata
└── message/<session-id>/msg_*.json      # Individual messages
```

## Session Format

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

## Message Format

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
