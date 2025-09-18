# Release Process

This project uses manual release scripts for better control over the release process.

## GitHub Actions vs Manual Scripts

- **GitHub Actions (`test.yml`)**: Automated CI testing on PRs and pushes
- **Manual Scripts**: Controlled releases with proper error handling

## Making a Release

### Prerequisites

- Set `NPM_OTP` environment variable with your npm 2FA token
- Ensure you're on main branch with clean working directory
- Have push access to the repository

### Release Commands

```bash
# Patch release (1.0.0 → 1.0.1)
NPM_OTP=123456 node scripts/bump-version.js patch

# Minor release (1.0.0 → 1.1.0)
NPM_OTP=123456 node scripts/bump-version.js minor

# Major release (1.0.0 → 2.0.0)
NPM_OTP=123456 node scripts/bump-version.js major
```

### What the Scripts Do

1. **`bump-version.js`**:
   - Calculates new version number
   - Updates all package.json files
   - Calls publish script

2. **`publish.ts`**:
   - Builds the project (`bun run prepack` + `./build.sh`)
   - Commits and tags the release
   - Pushes to GitHub
   - Creates GitHub release with changelog
   - Publishes to npm

### Benefits of Manual Release Process

- ✅ Full control over when releases happen
- ✅ Better error handling and recovery
- ✅ Easy to debug locally
- ✅ Consistent with project's tooling (bun)
- ✅ Simpler than semantic-release
- ✅ No complex CI dependencies

## Testing

GitHub Actions handle all testing automatically on PRs and pushes. The simplified CI workflow:

- Tests on Node 18 and 20
- Runs all test suites
- Validates CLI commands
- Tests MCP server startup
- Uploads coverage reports

This hybrid approach provides automated quality assurance while maintaining manual control over releases.
