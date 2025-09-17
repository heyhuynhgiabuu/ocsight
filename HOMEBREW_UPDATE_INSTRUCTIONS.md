# Homebrew Tap Update Instructions

## Fixed ocsight v0.7.3 Formula

The ocsight v0.7.3 release has been fixed with corrected JavaScript bundles that resolve the "Invalid or unexpected token" runtime errors.

### Updated Formula Location

The corrected formula is available at: `homebrew-tap-files/Formula/ocsight.rb`

### New Package Checksums

```
darwin-arm64: 30f123b32e319ad32b9929017fd76ac54210cdc70f5b1364b093f4b29c6df8f4
darwin-x64: 5f944a4bc3395d84e9768ec95c9f2abe64672397761d22a3cba282d54260a6b6
linux-arm64: 63bdd5320e0d940e7b81c664856c80a2d54ce84025efbe7d192b1ad65e7b15f1
linux-x64: fd15d563feaa3614cc8e61caa49bc1dc9f16f81151094055cfa2743cc30b7351
```

### Manual Update Steps

1. Navigate to your homebrew tap repository
2. Copy the updated formula:
   ```bash
   cp /path/to/ocsight/homebrew-tap-files/Formula/ocsight.rb Formula/ocsight.rb
   ```
3. Commit and push:
   ```bash
   git add Formula/ocsight.rb
   git commit -m "Update ocsight formula with fixed v0.7.3 checksums"
   git push
   ```
4. Test installation:
   ```bash
   brew install heyhuynhgiabuu/tap/ocsight
   ```

### Verification

After installation, verify the fix:

```bash
ocsight --version  # Should show: ocsight 0.7.3 (darwin/arm64)
ocsight analyze /path/to/opencode/project  # Should work without syntax errors
```

### What Was Fixed

- **Double shebang bug**: Removed duplicate `#!/usr/bin/env node` lines in JavaScript bundles
- **Version injection**: Added proper version detection across all distribution methods
- **Build consistency**: Ensured all platform packages use the corrected esbuild output

All binary packages in the GitHub release v0.7.3 now contain the fixed JavaScript bundles.
