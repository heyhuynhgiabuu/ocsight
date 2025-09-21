## IMPORTANT

- Try to keep things in one function unless composable or reusable
- DO NOT do unnecessary destructuring of variables
- DO NOT use `else` statements unless necessary
- DO NOT use `try`/`catch` if it can be avoided
- AVOID `try`/`catch` where possible
- AVOID `else` statements
- AVOID using `any` type
- AVOID `let` statements
- PREFER single word variable names where possible
- Use as many bun apis as possible like Bun.file()

## PROJECT RULE

Tools must be designed for agents, not humans. Build few high-impact tools that match natural workflows, return only high-signal context, and optimize for token efficiency. More tools ≠ better outcomes.

## DEVELOPMENT ENVIRONMENT

- Use **Bun** as the primary package manager and runtime for development (not npm)
- All scripts and development workflows are optimized for Bun's performance

## OPENCODE INTEGRATION

Plugins hook into OpenCode events using TypeScript modules in `.opencode/plugin` directory. Export async functions that receive context ({ project, client, $, directory, worktree }) and return hooks for events like "session.created", "tool.execute.after", etc.

## TOOL DESIGN PRINCIPLES

- Build evaluation-driven: test tools with real agent tasks before shipping
- Clear tool descriptions: write for a new hire, not an expert
- High-signal responses: return only what agents need, not everything
- Token efficiency: use pagination, filtering, truncation with defaults
- Error guidance: errors must tell agents how to fix, not just fail
- Natural workflows: tools should match how humans solve problems
- Response formats: use enums for concise/detailed output options
- Namespacing: group related tools with clear prefixes

## PLUGIN BEST PRACTICES

- Type safety: use TypeScript types from @opencode-ai/plugin
- Context awareness: leverage project, client, $ shell, directory, worktree
- Event-driven: hook into lifecycle events, don't poll
- Error handling: throw meaningful errors that guide agents
- Minimal state: avoid complex state management in plugins
- Performance: tools should be fast, agents are impatient

## UI DESIGN RULE

- Clean, minimal brutalist design inspired by opencode.ai and shadcn/ui
- Simple color schemes with lots of white space and clear typography
- Focus on functionality over decoration - no unnecessary visual elements
- Geometric simplicity with structured layouts and content-first approach
- High-signal, low-noise interfaces that prioritize clarity and usability
