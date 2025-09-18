# CLI Table Integration Design

## Library Selection

### Decision: cli-table3
- **Choice**: cli-table3 (maintained fork of cli-table)
- **Pros**: 
  - Actively maintained with security fixes
  - Supports word wrapping and alignment
  - Compatible with chalk-colored strings
  - Widely used and battle-tested
  - Has @types/cli-table3 on DefinitelyTyped
- **Cons**: 
  - CommonJS packaging (manageable in ESM with default import)
- **Rejected Alternative**: cli-table (unmaintained, higher security and compatibility risk)

## ESM Import Handling

### Import Strategy
- **Source**: ESM (tsconfig module: ES2022), distribution bundled via esbuild
- **Import Pattern**:
  ```typescript
  import Table from "cli-table3"
  ```
- **Rationale**: Node ESM can default-import CJS as the module's default; with esModuleInterop this is the simplest stable approach in TS + esbuild + Bun

### Typings
- Add @types/cli-table3 to devDependencies to ensure strong types
- No dynamic import unless runtime evidence indicates issues; esbuild and Bun handle the CJS interop reliably with default import

## Table Wrapper Module

### Module Structure
- **File**: `src/lib/table.ts`
- **Purpose**: Centralize table creation and styling logic

### Exports
```typescript
// Core table rendering
export function renderTable(params: {
  head: string[]
  rows: Array<Array<string | number>>
  align?: Array<"left" | "right" | "center">
  colWidths?: number[]
  compact?: boolean
}): string

// Key-value pairs (2-column table)
export function renderKV(
  pairs: Array<[string, string | number]>, 
  opts?: { align?: Array<"left" | "right" | "center"> }
): string

// Section formatting with header
export function section(title: string, body: string): string

// Type definitions
export type Cell = string | number
export type Row = Cell[]
```

### Styling Defaults (Brutalist, Minimal)
```typescript
const defaultOptions = {
  compact: true,
  style: { 
    head: [], 
    border: [] 
  },
  chars: {
    horizontal: '─',
    vertical: '│',
    'top-left': '┌',
    'top-right': '┐',
    'bottom-left': '└',
    'bottom-right': '┘',
    'top-mid': '┬',
    'bottom-mid': '┴',
    'left-mid': '├',
    'right-mid': '┤',
    'mid-mid': '┼'
  }
}
```

### Alignment Rules
- **Default**: Any column containing only numbers → right; otherwise left
- **Override**: Allow explicit align parameter in calls for predictable metrics tables

### Theming Conventions
- **Section titles**: `chalk.cyan.bold`
- **Neutral values**: `chalk.white`
- **Currency/cost totals**: `chalk.green`
- **"Most expensive" labels**: `chalk.red`
- **Highlights**: `chalk.yellow`

### Word Wrapping
- **Default**: Off for simplicity and compactness
- **Override**: Enable wordWrap per-table only if a section consistently overflows

## Data Mapping Per Section

### Overview Section
- **Format**: Metric | Value
- **Function**: `renderKV()`

### Cost Optimization Section
- **Metrics**: Metric | Value (using `renderKV()`)
- **Suggestions**: Numbered lines after the table (non-table preserves readability)

### Tool Efficiency Section
- **Columns**: Tool | Uses | Success% | Avg ms
- **Function**: `renderTable()` with 4 columns

### Usage Patterns Section
- **Peak Hours**: Hour | Sessions
- **Peak Days**: Day | Sessions
- **Function**: Two small tables using `renderTable()`

### Project Analysis Section
- **Detected Projects**: Project | Sessions | Total cost
- **Cross-project Insights**: Metric | Project (or Value)
- **Function**: `renderTable()` + `renderKV()`

### By Provider Section
- **Columns**: Provider | Sessions | Cost | Tokens
- **Function**: `renderTable()` with 4 columns

### Top Tools Section
- **Columns**: Tool | Uses
- **Function**: `renderTable()` with 2 columns

### Recent Activity Section
- **Columns**: Date | Sessions | Cost
- **Function**: `renderTable()` with 3 columns

### Detailed Statistics Sections
- **Sessions by Provider**: Provider | Sessions | %
- **Cost by Provider**: Provider | Cost | %
- **Tokens by Provider**: Provider | Tokens | %
- **Tool Usage**: Tool | Uses | %
- **Daily Activity**: Date | Sessions | Cost | Tokens
- **Function**: `renderTable()` with appropriate columns

## Formatting Helpers
- **Reuse**: Keep existing `formatNumber` and `formatCostInDollars` from `analysis.ts`
- **Integration**: Apply these functions to values before passing to table renderer

## Backwards Compatibility

### API Stability
- Keep exported function names (`formatAnalyzeOutput`, `formatStatsOutput`) and return type unchanged
- Keep section order and included sections identical to current output
- Preserve emojis in section headers

### Feature Flag (Optional but Recommended)
- **Environment Variable**: `OCSIGHT_PLAIN=1` forces legacy non-table rendering for troubleshooting
- **Default**: Tables on; legacy path only used if explicitly set
- **Implementation**: Small branch near the top of each formatter; avoid try/catch

## Packaging and Build

### Dependencies
- Add `cli-table3` to dependencies
- Add `@types/cli-table3` to devDependencies
- Add `chalk ^5.x` (ESM) to dependencies if missing

### Build Configuration
- No esbuild changes expected
- If esbuild externalizes cli-table3, ensure it's listed as a dependency in package.json

## Testing Strategy

### Test Structure
- **File**: `test/output.table.test.ts`
- **Fixture**: Build a UsageStatistics fixture covering all sections (providers, tools, projects, daily stats)

### Target Assertions
- Section headers present with emojis
- Tables rendered with expected borders (─, │, ┌, etc.)
- Alignment: right alignment for numeric columns (inspect string slices)
- Presence of chalk sequences in headers and highlighted values

### Legacy Testing
- If feature flag implemented, add test with `OCSIGHT_PLAIN=1`

## Performance Considerations

### Optimization
- Avoid unnecessary width computation; rely on defaults
- Build rows with preformatted strings to reduce work in cli-table3

### Memory
- Tables are ephemeral; no long-term memory retention needed
- Garbage collection will handle table instances

## Cross-Platform Considerations

### Character Support
- Use only standard box-drawing characters
- If terminal doesn't support them, content remains readable

### Color Support
- Respect `NO_COLOR` automatically via chalk behavior
- No additional color detection logic needed

## Error Handling

### Import Errors
- Graceful fallback to legacy rendering if cli-table3 import fails
- Log warning but continue operation

### Runtime Errors
- Wrap table rendering in try/catch for production robustness
- Fallback to legacy rendering on any table-related errors

## Migration Strategy

### Phase 1: Infrastructure
- Add dependencies and table wrapper module
- Implement basic table rendering functions

### Phase 2: Incremental Refactoring
- Refactor one section at a time in output.ts
- Keep identical section order and content
- Use wrapper functions consistently

### Phase 3: Testing and Validation
- Add comprehensive snapshot tests
- Verify cross-platform compatibility
- Performance testing with large datasets

### Phase 4: Documentation
- Update developer documentation
- Add migration notes to changelog
- Document table extension guidelines

## Risk Mitigation

### Library Risk
- Chose cli-table3 (maintained) over cli-table (unmaintained)
- Feature flag allows quick rollback if issues arise

### Compatibility Risk
- Comprehensive testing across platforms
- Preserve legacy code paths during transition

### Performance Risk
- Benchmark with realistic data sizes
- Optimize only if performance issues detected

## Success Metrics

- All sections render as properly formatted tables
- Chalk theming preserved throughout
- Numeric columns properly aligned
- Performance maintained (<10ms per table)
- All tests pass including new snapshot tests
- Cross-platform compatibility verified
- No breaking changes to public API