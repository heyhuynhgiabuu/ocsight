# Code Style and Conventions

## General Principles (from AGENTS.md)
- **Single function approach**: Keep things in one function unless composable/reusable
- **Minimal destructuring**: Avoid unnecessary destructuring of variables
- **Avoid else statements**: Use early returns instead of else clauses
- **Minimal try/catch**: Avoid try/catch unless absolutely necessary
- **No any type**: Use proper TypeScript types
- **Prefer const**: Avoid let statements, use const for immutable values
- **Concise naming**: Single word variable names where possible
- **Bun APIs**: Use Bun.file() and other Bun-specific APIs when possible

## TypeScript Configuration
- **Target**: ES2022 with Node.js module resolution
- **Strict mode**: All strict typing enabled
- **ESM only**: ES modules throughout, no CommonJS
- **Declaration files**: Generate .d.ts and source maps for distribution

## File Organization
```
src/
├── commands/     # CLI command handlers
├── lib/         # Core business logic  
├── mcp/         # Model Context Protocol server
└── types/       # TypeScript type definitions
```

## Naming Conventions
- **Files**: kebab-case (analyze.ts, table.ts)
- **Functions**: camelCase with descriptive names
- **Types**: PascalCase interfaces and types
- **Constants**: SCREAMING_SNAKE_CASE for module-level constants