# CLI Table Integration Tasks

## Dependencies and Setup

### 1) Decide and Pin Library
- **Task**: Choose cli-table3 version
- **Details**: 
  - Library: cli-table3
  - Version: ^0.6.x (latest compatible)
  - Document rationale in code comment at top of table.ts
- **Acceptance**: Version pinned and documented

### 2) Add Dependencies
- **Task**: Update package.json with required dependencies
- **Details**:
  - Add `cli-table3` to dependencies
  - Add `@types/cli-table3` to devDependencies  
  - Add `chalk ^5.x` (ESM) to dependencies if missing
- **Acceptance**: All dependencies added to correct sections

### 3) Install and Validate
- **Task**: Install dependencies and verify type resolution
- **Details**:
  - Run `bun install`
  - Confirm type resolution for cli-table3 and chalk works
  - Test basic import in development environment
- **Acceptance**: Installation successful, types resolve correctly

## Implementation

### 4) Create Table Wrapper
- **Task**: Implement centralized table rendering module
- **File**: `src/lib/table.ts`
- **Implementation**:
  ```typescript
  import Table from "cli-table3"
  import chalk from "chalk"
  
  export type Cell = string | number
  export type Row = Cell[]
  
  export function renderTable(params: {
    head: string[]
    rows: Row[]
    align?: Array<"left" | "right" | "center">
    colWidths?: number[]
    compact?: boolean
  }): string
  
  export function renderKV(
    pairs: Array<[string, Cell]>, 
    opts?: { align?: Array<"left" | "right" | "center"> }
  ): string
  
  export function section(title: string, body: string): string
  ```
- **Defaults**:
  - compact: true
  - style: { head: [], border: [] }
  - chars configured to minimal box drawing
- **Acceptance**: All functions implemented and return properly formatted strings

### 5) Refactor formatAnalyzeOutput to Use Tables
- **Task**: Replace manual string assembly with table rendering
- **File**: `src/lib/output.ts`
- **Sections to Convert**:
  - Overview → `renderKV`
  - Cost Optimization → `renderKV` for metrics; keep suggestions as numbered lines
  - Tool Efficiency → `renderTable` with 4 columns
  - Usage Patterns → two small tables (peak hours, peak days)
  - Project Analysis → detected projects table + cross-project KV
  - By Provider → 4-column table
  - Top Tools → 2-column table
  - Recent Activity → 3-column table
- **Preserve**:
  - Section titles and emojis with `chalk.cyan.bold`
  - Existing number and currency formatting
- **Acceptance**: All sections use table rendering, output structure preserved

### 6) Refactor formatStatsOutput to Use Tables
- **Task**: Convert detailed statistics to table format
- **File**: `src/lib/output.ts`
- **Sections to Convert**:
  - Sessions by Provider → Provider | Sessions | %
  - Cost by Provider → Provider | Cost | %
  - Tokens by Provider → Provider | Tokens | %
  - Tool Usage → Tool | Uses | %
  - Daily Activity → Date | Sessions | Cost | Tokens
- **Preserve**: Section titles with `chalk.cyan`
- **Acceptance**: All detailed stats sections use table rendering

### 7) Optional Legacy Fallback
- **Task**: Implement environment variable for legacy rendering
- **Details**:
  - Honor `OCSIGHT_PLAIN=1`
  - If set, use current manual rendering path; otherwise use tables
  - Implement with small branch near top of each formatter
  - Keep legacy code paths accessible or factor into helper functions
- **Acceptance**: Environment variable controls rendering mode

## Quality Gates

### 8) Unit and Snapshot Tests
- **Task**: Create comprehensive test suite
- **File**: `test/output.table.test.ts`
- **Implementation**:
  - Build UsageStatistics fixture covering all sections
  - Snapshot tests for formatAnalyzeOutput and formatStatsOutput
  - Assertions:
    - Section headers present with emojis
    - Presence of table border characters (─, │, ┌, etc.)
    - Alignment: right alignment for numeric columns
    - Presence of chalk sequences in headers and highlighted values
  - If legacy fallback implemented, add test with `OCSIGHT_PLAIN=1`
- **Acceptance**: All tests pass, snapshots capture expected output

### 9) Cross-Platform CI
- **Task**: Ensure tests run on multiple platforms
- **Details**:
  - Verify existing GitHub workflow runs tests on ubuntu-latest and macos-latest
  - If needed, extend test.yml to include OS matrix
- **Acceptance**: CI passes on both macOS and Linux

### 10) Manual Verification
- **Task**: Visual inspection of output
- **Details**:
  - Run `bun run dev` with representative data
  - Test narrow terminal (80 cols) and standard 120+ cols
  - Test with `NO_COLOR=1` to verify decolorized readable tables
- **Acceptance**: Output looks correct in all scenarios

## Documentation and Maintenance

### 11) Developer Notes
- **Task**: Update project documentation
- **Details**:
  - Update README.md or add DEVNOTES.md section:
    - Choice of cli-table3 and import pattern
    - How to add a new table using renderKV/renderTable
    - Theming conventions and alignment guidelines
- **Acceptance**: Documentation updated with table integration guidelines

### 12) Version and Changelog
- **Task**: Update version and document changes
- **Details**:
  - Bump patch/minor version accordingly
  - Note output formatting change (from lists to tables) as non-breaking for API
  - Update CHANGELOG.md with migration notes
- **Acceptance**: Version updated, changelog documents changes

## Acceptance Criteria

### Core Functionality
- [ ] formatAnalyzeOutput and formatStatsOutput return valid strings with tables for all sections
- [ ] Chalk theming preserved for headers and highlighted values
- [ ] Numeric columns right-aligned; text left-aligned
- [ ] All existing data and calculations preserved

### Quality Assurance
- [ ] Tests pass in CI on macOS and Linux
- [ ] Snapshot tests verify output structure
- [ ] Manual verification confirms visual quality
- [ ] Performance maintained (<10ms per table)

### Compatibility
- [ ] No new CLI flags added
- [ ] No change to function signatures
- [ ] Library choice documented and import works under Bun dev and bundled Node 18 runtime
- [ ] Cross-platform compatibility maintained

### Documentation
- [ ] Developer documentation updated
- [ ] Changelog documents the change
- [ ] Version appropriately bumped

## Decision Summary

### cli-table3 vs cli-table
- **Choice**: cli-table3
- **Reasons**:
  - Maintained with up-to-date fixes
  - Integrates cleanly with chalk
  - Has types available
  - Reduces maintenance risk and improves compatibility

### ESM Import Strategy
- **Pattern**: `import Table from "cli-table3"`
- **Rationale**: Works with tsconfig ES2022 + esModuleInterop, Bun dev, and esbuild
- **Fallback**: No dynamic import needed unless runtime issues discovered

## Migration Strategy

### Phase 1: Infrastructure
- [ ] Add dependencies and table wrapper module
- [ ] Implement basic table rendering functions

### Phase 2: Incremental Refactoring
- [ ] Refactor one section at a time in output.ts
- [ ] Keep identical section order and content
- [ ] Use wrapper functions consistently

### Phase 3: Testing and Validation
- [ ] Add comprehensive snapshot tests
- [ ] Verify cross-platform compatibility
- [ ] Performance testing with large datasets

### Phase 4: Documentation
- [ ] Update developer documentation
- [ ] Add migration notes to changelog
- [ ] Document table extension guidelines

## Risk Mitigation

### Library Risk
- **Mitigation**: Chose cli-table3 (maintained) over cli-table (unmaintained)
- **Fallback**: Feature flag allows quick rollback if issues arise

### Compatibility Risk
- **Mitigation**: Comprehensive testing across platforms
- **Fallback**: Preserve legacy code paths during transition

### Performance Risk
- **Mitigation**: Benchmark with realistic data sizes
- **Fallback**: Optimize only if performance issues detected

## Success Metrics

- All sections render as properly formatted tables
- Chalk theming preserved throughout
- Numeric columns properly aligned
- Performance maintained (<10ms per table)
- All tests pass including new snapshot tests
- Cross-platform compatibility verified
- No breaking changes to public API