# Release Process

This project uses manual release scripts for better control over the release process.

## GitHub Actions vs Manual Scripts

- **GitHub Actions (`test.yml`)**: Automated CI testing on PRs and pushes
- **Manual Scripts**: Controlled releases with proper error handling

## Making a Release

### Prerequisites

- Set `NPM_OTP` environment variable with your npm 2FA token
- Ensure you're on main branch with clean working directory
- Have push access to the repository and homebrew-tap

### Release Commands

```bash
# Patch release (1.0.0 → 1.0.1)
NPM_OTP=123456 node scripts/bump-version.cjs patch

# Minor release (1.0.0 → 1.1.0)
NPM_OTP=123456 node scripts/bump-version.cjs minor

# Major release (1.0.0 → 2.0.0)
NPM_OTP=123456 node scripts/bump-version.cjs major
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
   - **Updates Homebrew formula automatically**

3. **`update-homebrew.js`**:
   - Downloads all platform binaries (macOS, Linux, ARM64, x64)
   - Calculates SHA256 checksums
   - Updates Formula/ocsight.rb with new version and URLs
   - Commits and pushes to homebrew-tap repository

### Benefits of Manual Release Process

- ✅ Full control over when releases happen
- ✅ Better error handling and recovery
- ✅ Easy to debug locally
- ✅ Consistent with project's tooling (bun)
- ✅ Simpler than semantic-release
- ✅ No complex CI dependencies
- ✅ **Automatic Homebrew updates**

## Release Checklist

### Automated Steps (handled by scripts)

- [x] Version bump in all package.json files
- [x] Build project (CLI, MCP, Web, Go binaries)
- [x] Create git commit and tag
- [x] Push to GitHub with tags
- [x] Create GitHub release with binaries
- [x] Publish to npm
- [x] Update Homebrew formula with new checksums
- [x] Push Homebrew formula to tap repository

### Manual Verification

- [ ] GitHub release created successfully
- [ ] npm package published
- [ ] Homebrew formula updated
- [ ] All binaries downloadable
- [ ] CLI works: `brew upgrade ocsight && ocsight --version`

## Testing

GitHub Actions handle all testing automatically on PRs and pushes. The simplified CI workflow:

- Tests on Node 18 and 20
- Runs all test suites
- Validates CLI commands work
- Tests MCP server startup
- Uploads coverage reports

## Troubleshooting

### Version Sync Issues

If versions get out of sync between npm/GitHub/Homebrew:

```bash
# Check current state
git tag --list | tail -5
npm view ocsight version
brew info ocsight

# Create missing tags
git tag v1.2.3 <commit-hash>
git push origin v1.2.3

# Manual Homebrew update
OCSIGHT_VERSION=1.2.3 node scripts/update-homebrew.cjs
```

### Build Failures

```bash
# Test builds locally
bun run build
./build.sh

# Test CLI
node index.js --version
node index.js analyze --help
```

This hybrid approach provides automated quality assurance while maintaining manual control over releases, with full Homebrew integration.
