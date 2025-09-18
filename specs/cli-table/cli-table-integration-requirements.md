# CLI Table Integration Requirements

## Business Goals

- Improve readability and consistency of CLI output by rendering statistics as structured ASCII tables
- Preserve current chalk-based color theming and emojis for section titles and emphasis
- Keep return type and call sites stable: formatAnalyzeOutput and formatStatsOutput must continue to return string
- Ensure cross-platform compatibility on macOS and Linux terminals with no special fonts or Unicode beyond simple box drawing
- Minimize maintenance burden and avoid scattering table logic across files

## Functional Requirements

### Core Functionality
- Replace manual string assembly in src/lib/output.ts with table rendering for:
  - Overview metrics (sessions, messages, tools, total cost, tokens)
  - Cost optimization insights (averages, most expensive items, top expensive sessions count, suggestions list)
  - Tool efficiency (most used tools with success rate and average duration)
  - Usage patterns (peak hours, peak days)
  - Project analysis (detected projects, cross-project insights)
  - Provider breakdown (sessions, cost, tokens per provider)
  - Top tools (tool name and usage count)
  - Recent activity (last 7 days with sessions and cost)
  - Detailed statistics sections (sessions by provider with %, cost by provider with %, tokens by provider with %, tool usage with %, daily activity)

### Table Styling Requirements
- Provide consistent table style:
  - Compact spacing, minimal borders, clean brutalist look
  - Right-aligned numeric columns; left-aligned text columns
  - Headers styled with chalk (cyan); values themed consistently (white for neutral, green for cost positives, red for expensive, yellow for highlights)

### ESM Compatibility
- Must import and work under current tsconfig (module: ES2022) and Bun dev script
- Must work in bundled distribution (esbuild) and Node 18 runtime

### Library Decision
- Choose maintained library
  - Prefer cli-table3 over cli-table due to active maintenance, security fixes, broad adoption, and TypeScript typings availability

### Performance Requirements
- Rendering tables for max section sizes (e.g., 50 tools, 30 days) should remain performant (<10ms per table on Node 18)

### Developer Ergonomics
- Encapsulate table configuration in a single helper module
- Typed interfaces for inputs to prevent "any" leakage

### Testing Requirements
- Snapshot tests for representative data to lock output shape and spacing
- Unit tests verifying alignment, header presence, and chalk tokens

### Documentation Requirements
- Brief developer note on how to extend tables, and import guidelines for ESM/CJS interop

## Non-Functional Requirements

### Dependencies
- No new heavy transitive dependency chains
- No change to content semantics (values, ordering, section presence) other than rendering structure

### Compatibility
- Avoid regressions in CI packaging; no change to CLI flags/output API contracts
- Respect NO_COLOR and FORCE_COLOR environment variables automatically via chalk behavior

### Backwards Compatibility
- Keep existing function signatures and return types unchanged
- Preserve all existing data and calculations; only change presentation

## Out of Scope

- Progress bar formatting (formatProgressBar remains as is)
- Changing the structure of upstream stats calculation
- Website/Docs UI changes
- Adding new CLI flags or options
- Changing the data models or analysis logic

## Success Criteria

- All current output sections render as properly formatted tables
- Chalk theming and emojis are preserved in section headers
- Numeric columns are right-aligned; text columns left-aligned
- Performance is maintained or improved
- All existing tests continue to pass
- New snapshot tests verify table structure and styling
- Cross-platform compatibility is maintained