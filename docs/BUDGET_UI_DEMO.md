# Budget Feature - UI/UX Demo

This document shows the exact UI flow for the budget management feature, matching OpenCode's `oc auth login` aesthetic.

## 1. Adding Provider Budget (`ocsight budget add`)

### Step 1: Initial Screen

```
$ ocsight budget add

💰 Configure Budget Limits

Fetching providers from models.dev...

◆ Select provider
```

### Step 2: Provider Selection (No Search)

```
◆ Select provider

  Search: █
  ● Anthropic (recommended)
  ○ OpenAI
  ○ OpenRouter
  ○ Google AI
  ○ Azure OpenAI
  ○ AWS Bedrock
  ○ Cohere
  ○ Mistral
  ○ Together AI
  ○ Fireworks AI
  ...

  ↑/↓ to select • Enter: confirm • Type: to search
```

### Step 3: Provider Selection (With Search "open")

```
◆ Select provider

  Search: open█
  ○ OpenAI
  ○ OpenRouter
  ○ Azure OpenAI

  ↑/↓ to select • Enter: confirm • Type: to search
```

### Step 4: Provider Selected (OpenRouter)

```
◆ Select provider

✓ OpenRouter

◆ Set monthly budget limit

  Monthly limit (USD): $█
```

### Step 5: Budget Input

```
◆ Select provider

✓ OpenRouter

◆ Set monthly budget limit

  Monthly limit (USD): $75

◆ Confirm budget configuration

  Provider: OpenRouter
  Monthly limit: $75.00

  Save this configuration? (y/N): █
```

### Step 6: Confirmation

```
◆ Select provider

✓ OpenRouter

◆ Set monthly budget limit

✓ $75.00

◆ Confirm budget configuration

✓ Saved

✓ Budget limit saved: OpenRouter → $75/month

Run ocsight budget show to view all limits
```

## 2. Setting Global Budget (`ocsight budget set`)

```bash
$ ocsight budget set --monthly 200 --warning 70 --critical 90

✓ Global budget limit set to $200/month
  Warning at 70% ($140.00)
  Critical at 90% ($180.00)
```

## 3. Viewing Budget Configuration (`ocsight budget show`)

### With Configuration

```bash
$ ocsight budget show

💰 Budget Configuration

Global Monthly Limit: $200
  🟡 Warning at 70% ($140.00)
  🔴 Critical at 90% ($180.00)

Provider Limits:

  ● Anthropic
    Monthly: $50
  ● OpenRouter
    Monthly: $75
  ○ OpenAI
    Monthly: $75
```

### Without Configuration

```bash
$ ocsight budget show

💰 Budget Configuration

No budget limits configured

Run:
  ocsight budget set --monthly 200
or:
  ocsight budget add
```

## 4. Removing Provider Budget (`ocsight budget remove`)

```bash
$ ocsight budget remove openrouter

  Remove budget limit for OpenRouter? (y/N): y

✓ Removed budget limit for OpenRouter
```

## 5. Integration with Live Monitor

Once budgets are configured, `ocsight live` displays budget status:

```
OpenCode Live Monitor • Real-time token usage and cost tracking

┌──────────────────────────────────────────────────────────────────────────┐
│   BUDGET HEALTH (October 2025)                                          │
│ ████████████████░░░░  82% used ($164.23 / $200.00)                      │
│ 🟡 $35.77 remaining • 4.3 days at current rate                          │
├──────────────────────────────────────────────────────────────────────────┤
│   PROVIDER BREAKDOWN                                                     │
│ • Anthropic     $42.15  (84%)  [$50 limit]  🟡                         │
│ • OpenRouter    $89.34  (119%) [$75 limit]  🔴 EXCEEDED               │
│ • OpenAI        $32.74  (44%)  [$75 limit]  🟢                         │
├──────────────────────────────────────────────────────────────────────────┤
│   SESSION (ses_67df)                                                     │
│ ████████░░░░░░░░░░░░  13.8%     (Context: 138.4K/1.0M)                 │
│ Last: 13s ago  Model: claude-sonnet-4-5  Provider: Anthropic            │
├──────────────────────────────────────────────────────────────────────────┤
│   ACTIVITY (ACTIVE) - 30min avg                                         │
│ ● Spending: $8.74/hour  Recent: $4.37                                   │
├──────────────────────────────────────────────────────────────────────────┤
│   SESSION TOTALS                                                         │
│ Messages: 1,462  Tokens: 147.6M  Cost: $77.46                           │
├──────────────────────────────────────────────────────────────────────────┤
│   ALERTS                                                                 │
│ 🟡 Budget 82% used - approaching $200 limit                             │
│ 🔴 OpenRouter budget exceeded by $14.34                                 │
│ ⚠️  At current rate: total budget exceeded in 4.3 days                  │
└──────────────────────────────────────────────────────────────────────────┘

Refreshing every 5s  Press Ctrl+C to stop
```

## Design Principles

### 1. **Interactive Flow**

- Matches OpenCode's `oc auth login` UX exactly
- Real-time search filtering
- Keyboard-first navigation
- Visual feedback at each step

### 2. **Progressive Disclosure**

- One step at a time
- Clear checkmarks (✓) for completed steps
- Next step appears after confirmation

### 3. **Visual Hierarchy**

```
◆ = Current step
✓ = Completed step
● = Selected/Active
○ = Unselected/Inactive
█ = Cursor
```

### 4. **Color Coding**

- Cyan/Blue: Interactive elements, selections
- Green: Success states, healthy budgets
- Yellow: Warnings, approaching limits
- Red: Critical alerts, exceeded budgets
- Gray/Dim: Instructions, secondary info

### 5. **Feedback Patterns**

```
Before: Search: █
During: Search: ope█
After:  ✓ OpenRouter
```

### 6. **Budget Status Indicators**

```
🟢 Healthy    (< 70%)   Normal operation
🟡 Warning    (70-90%)  Monitor closely
🔴 Critical   (> 90%)   Immediate attention required
⚠️  Exceeded            Over budget limit
```

## Keyboard Controls

### Provider Selection

- `↑` / `↓` - Navigate options
- `Type` - Search/filter providers
- `Enter` - Confirm selection
- `Escape` / `Ctrl+C` - Cancel

### Budget Input

- `Type` - Enter amount
- `Enter` - Confirm
- `Ctrl+C` - Cancel

### Confirmation

- `y` / `yes` - Confirm
- `n` / `no` / `Enter` - Cancel

## Error States

### Invalid Budget Amount

```
◆ Set monthly budget limit

  Monthly limit (USD): $abc

✗ Invalid amount
```

### No Providers Found

```
◆ Select provider

  Search: xyz█
  No providers found

  ↑/↓ to select • Enter: confirm • Type: to search
```

### API Fetch Error

```
$ ocsight budget add

💰 Configure Budget Limits

Fetching providers from models.dev...
✗ Failed to fetch providers from models.dev

Try again later or check your internet connection
```

## Success States

### Budget Added

```
✓ Budget limit saved: OpenRouter → $75/month

Run ocsight budget show to view all limits
```

### Budget Updated

```
✓ Budget limit updated: OpenRouter $50 → $75/month
```

### Budget Removed

```
✓ Removed budget limit for OpenRouter
```

## Accessibility

- **Keyboard-only navigation**: All interactions possible without mouse
- **Screen reader friendly**: Clear labels and status indicators
- **Color blind safe**: Uses symbols (●○✓✗) alongside colors
- **Terminal compatibility**: Works in any ANSI-compatible terminal
