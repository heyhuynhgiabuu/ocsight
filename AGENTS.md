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

## BUN.JS BEST PRACTICES & OPTIMIZATION

### Core Runtime Usage

**File Operations**

- Use `Bun.file()` for reading files instead of `fs.readFile()`
- Use `Bun.write()` for writing files instead of `fs.writeFile()`
- Leverage `Bun.file().text()`, `.json()`, `.arrayBuffer()`, `.stream()` for different data formats
- Use `Bun.stdin`, `Bun.stdout`, `Bun.stderr` for stream operations

**HTTP & Networking**

- Use `Bun.serve()` for high-performance HTTP servers instead of Express/Fastify
- Leverage native `fetch()` for HTTP requests
- Use `Bun.spawn()` for child processes instead of `child_process.spawn()`
- Utilize WebSocket support via `new WebSocket()` and `Bun.serve()` websocket handlers

**TypeScript & JSX**

- Execute TypeScript files directly with `bun run` - no transpilation needed
- Use `bunfig.toml` for TypeScript configuration instead of separate `tsconfig.json` when possible
- Leverage native JSX support without Babel

### Performance Optimization

**Async Operations**

- Use `async/await` for all I/O operations - never block the event loop
- Use `Promise.all()` for concurrent operations when possible
- Use `Bun.sleep()` for non-blocking delays instead of `setTimeout()`
- Avoid synchronous file operations - always use async variants

**Memory Management**

- Use `Bun.gc()` to manually trigger garbage collection when needed
- Prefer streaming large files instead of loading entirely into memory
- Use `Bun.file()` lazy loading - files aren't read until accessed
- Monitor memory usage with `process.memoryUsage()`

**Bundle & Build**

- Use `bun build` for production bundling with `--minify` and `--target=bun`
- Leverage tree shaking - import only what you need: `import debounce from "lodash/debounce"`
- Use `--compile` to create single-file executables for deployment
- Enable source maps in production with `--sourcemap`

### Package Management

**Dependencies**

- Use `bun install` instead of `npm install` - 20x faster installation
- Use `bun add` for adding dependencies, `bun remove` for removal
- Leverage `bun.lockb` binary lockfile for faster dependency resolution
- Use `bunx` for executing packages without installation

**Scripts & Workflow**

- Use `bun --hot` for development with hot reloading
- Use `bun test` for Jest-compatible testing - 100x faster than Jest
- Use `bun run` for package.json scripts
- Enable watch mode with `--watch` flag

### Database & Storage

**SQLite Integration**

- Use `bun:sqlite` for built-in SQLite database operations
- Leverage in-memory databases with `new Database(':memory:')`
- Use prepared statements for performance: `db.prepare('SELECT * FROM users WHERE id = ?')`
- Close database connections: `db.close()`

**Environment Configuration**

- Use `.env` files - Bun loads them automatically into `process.env`
- Access environment via `Bun.env` instead of `process.env` when possible
- Use `bunfig.toml` for runtime configuration

### Testing & Development

**Testing**

- Use `bun:test` for Jest-compatible testing without external dependencies
- Use `test.concurrent()` for parallel test execution
- Use `--watch` mode for test-driven development
- Use `--coverage` for code coverage reporting

**Development Tools**

- Use `bun fmt` for code formatting
- Use `bun lint` for linting (when available)
- Use `--inspect` for debugging with VS Code or browser devtools
- Leverage `import.meta` for module metadata: `import.meta.main`, `import.meta.path`

### Error Handling & Debugging

**Error Patterns**

- Use structured error handling with meaningful error messages
- Leverage Bun's improved stack traces for debugging
- Use `console.time()` and `console.timeEnd()` for performance profiling
- Use `Bun.peek()` for inspecting objects without triggering getters

**Production Deployment**

- Use `bun build --compile` for creating standalone executables
- Set `NODE_ENV=production` for production optimizations
- Use `--smol` flag to reduce memory usage in production
- Monitor performance with built-in metrics

### Configuration Files

**bunfig.toml Setup**

```toml
[install]
# Use isolated installs for better dependency management
linker = "isolated"
# Enable auto-install for missing dependencies
auto = "auto"

[test]
# Enable coverage reporting
coverage = true
# Set coverage threshold
coverageThreshold = 0.8

[run]
# Use Bun shell for cross-platform compatibility
shell = "bun"
# Auto-alias node to bun for compatibility
bun = true
```

### Migration from Node.js

**API Replacements**

- Replace `fs.readFile()` with `Bun.file().text()`
- Replace `require()` with ES6 `import` statements
- Replace `process.env` with `Bun.env` where possible
- Replace `child_process.spawn()` with `Bun.spawn()`
- Replace `http.createServer()` with `Bun.serve()`

**Compatibility Notes**

- Most Node.js APIs work natively in Bun
- Test native modules compatibility before migration
- Use `node:` prefix for Node.js-specific modules when needed
- Some npm packages may need polyfills - test thoroughly

### Security Best Practices

**Input Validation**

- Use Bun's built-in security features
- Validate all inputs before processing
- Use parameterized queries for database operations
- Leverage `Bun.password()` for secure password hashing

**Performance Monitoring**

- Use `performance.now()` for precise timing
- Monitor memory usage with `process.memoryUsage()`
- Use `Bun.nanoseconds()` for high-resolution timing
- Profile applications with built-in debugging tools

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

## BUN.SHELL & AUTOMATION

### Shell Scripting with Bun

**Cross-Platform Shell**

- Use `$` template literal tag for shell commands: `await $`echo "Hello"``
- Leverage built-in commands: `ls`, `cd`, `rm`, `mkdir`, `cat`, `touch`
- Use redirection operators: `>`, `>>`, `<`, `2>`, `&>`
- Chain commands with pipes: `await $`cat file.txt | grep "pattern" | wc -l``

**Process Management**

- Use `Bun.spawn()` for advanced process control
- Leverage `Bun.spawnSync()` for synchronous operations
- Use `$.nothrow()` to prevent non-zero exit codes from throwing
- Access stdout/stderr: `const { stdout, stderr } = await $`command`.quiet()`

**Environment & Working Directory**

- Set environment variables: `await $`FOO=bar bun -e 'console.log(process.env.FOO)'``
- Change working directory: `await $`pwd`.cwd("/tmp")`
- Use string interpolation safely: `await $`echo ${userInput}`` (auto-escaped)

### Advanced Bun Features

**Binary Data Handling**

- Use `Bun.file()` for efficient binary file operations
- Convert between formats: `buffer.toArrayBuffer()`, `blob.stream()`
- Use `Uint8Array` for binary manipulation
- Leverage `Bun.gzipSync()` and `Bun.gunzipSync()` for compression

**Web Standards**

- Use native `fetch()`, `Response()`, `Request()` objects
- Leverage `Headers`, `URL`, `URLSearchParams` APIs
- Use `FormData` for multipart form data
- Implement WebSocket servers with `Bun.serve()` websocket handlers

**Utilities & Helpers**

- Use `Bun.deepEquals()` for object comparison
- Use `Bun.randomUUIDv7()` for UUID generation
- Use `Bun.which()` to find executable paths
- Use `Bun.escapeHTML()` for HTML escaping

## PRODUCTION DEPLOYMENT

### Docker Optimization

**Multi-stage Builds**

```dockerfile
# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "start"]
```

**Performance Tuning**

- Use `--smol` flag for reduced memory usage
- Enable production mode: `NODE_ENV=production`
- Use worker threads for CPU-intensive tasks
- Implement proper error handling and logging

### Monitoring & Observability

**Performance Metrics**

- Monitor startup time with `console.time()`
- Track memory usage: `process.memoryUsage()`
- Use `performance.now()` for precise timing
- Implement health checks with `Bun.serve()`

**Error Handling**

- Use structured error logging
- Implement graceful shutdown with `process.on('SIGTERM')`
- Use try/catch for async operations where necessary
- Monitor unhandled promise rejections

## MIGRATION CHECKLIST

### From Node.js to Bun

**Pre-Migration**

- [ ] Test all npm packages for Bun compatibility
- [ ] Identify native modules that may need replacement
- [ ] Review build scripts and CI/CD pipelines
- [ ] Backup existing Node.js configuration

**Migration Steps**

- [ ] Replace `npm install` with `bun install`
- [ ] Update package.json scripts to use `bun`
- [ ] Replace Node.js APIs with Bun equivalents
- [ ] Update Dockerfile to use `oven/bun` base image
- [ ] Test all functionality thoroughly
- [ ] Update CI/CD pipelines for Bun

**Post-Migration**

- [ ] Monitor performance improvements
- [ ] Update documentation
- [ ] Train team on Bun-specific features
- [ ] Implement Bun-specific optimizations

### Compatibility Matrix

**Fully Supported**

- ✅ ES Modules and CommonJS
- ✅ TypeScript and JSX
- ✅ Most npm packages
- ✅ Node.js core APIs (fs, path, crypto, etc.)
- ✅ Web APIs (fetch, Response, Request)

**Partial Support**

- 🟡 Some native modules
- 🟡 Advanced Node.js features
- 🟡 Specific npm packages with native addons

**Not Supported**

- ❌ V8-specific APIs
- ❌ Some Node.js internals
- ❌ Certain native addons

## RESOURCES & REFERENCE

### Official Documentation

- [Bun Documentation](https://bun.com/docs)
- [API Reference](https://bun.com/reference)
- [GitHub Repository](https://github.com/oven-sh/bun)

### Performance Benchmarks

- HTTP servers: 3x faster than Node.js
- Package installation: 20x faster than npm
- Test runner: 100x faster than Jest
- Startup time: 4x faster than Node.js

### Community & Support

- Discord: [bun.sh/discord](https://bun.sh/discord)
- GitHub Issues: [github.com/oven-sh/bun/issues](https://github.com/oven-sh/bun/issues)
- Twitter: [@bunjavascript](https://twitter.com/bunjavascript)
