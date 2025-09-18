# Development Commands

## Essential Commands
```bash
# Development and testing
bun install          # Install dependencies
bun run dev <cmd>     # Run commands in development (bun run dev analyze)
bun test             # Run all tests
bun run build        # TypeScript compilation to dist/

# Release and distribution  
bun run bundle       # Bundle with esbuild for distribution
bun run prepack      # Full build pipeline (build + bundle + prepare dist/)

# Development workflow
bun run dev analyze --days 7     # Test analyze command
bun run dev stats --provider openai  # Test stats with filtering
bun run dev export --format json     # Test export functionality
```

## Build Pipeline
1. **Development**: `bun run dev` - Direct TypeScript execution via Bun
2. **Testing**: `bun test` - Run test suite with table rendering validation
3. **Build**: `bun run build` - TypeScript compilation to dist/
4. **Bundle**: `bun run bundle` - esbuild creates single-file distribution
5. **Package**: `bun run prepack` - Full pipeline for npm/Homebrew distribution

## System Commands (macOS)
```bash
# File operations
ls -la               # List with permissions
find . -name "*.ts"  # Find TypeScript files  
grep -r "pattern"    # Recursive text search
git status           # Git repository status
```

## Testing Commands
```bash
bun test                    # All tests
bun test test/table.test.js # Specific test file
NO_COLOR=1 bun test        # Test without color output
```