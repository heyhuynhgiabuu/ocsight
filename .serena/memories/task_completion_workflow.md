# Task Completion Workflow

## When Task is Complete
1. **Run Tests**: `bun test` - Ensure all tests pass including table rendering
2. **Build Check**: `bun run build` - Verify TypeScript compilation succeeds  
3. **Functionality Test**: `bun run dev <command>` - Manual verification of commands
4. **Code Quality**: Check adherence to AGENTS.md conventions

## Pre-commit Checklist
- [ ] All tests passing (`bun test`)
- [ ] TypeScript builds without errors (`bun run build`)
- [ ] Commands work in development (`bun run dev analyze`)
- [ ] Table output renders correctly (manual visual check)
- [ ] NO_COLOR environment variable respected
- [ ] Code follows conventions (no else, minimal try/catch, const over let)

## Release Process
1. **Full Build**: `bun run prepack` - Complete build pipeline
2. **Version Update**: Update version in package.json if needed
3. **Documentation**: Update README.md and CHANGELOG.md as needed
4. **Cross-platform**: Consider Go binary wrapper and Homebrew distribution

## Quality Gates
- **Performance**: Commands should complete in <2 seconds for typical datasets
- **Output**: Structured tables with proper alignment and Unicode borders
- **Error Handling**: Meaningful error messages that guide users to solutions
- **Compatibility**: Works on macOS and Linux with Node.js >=18