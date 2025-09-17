#!/bin/bash

# Update Homebrew tap with the fixed formula
echo "Updating Homebrew tap with fixed ocsight formula..."

# Check if tap directory exists
TAP_DIR="../homebrew-tap"
if [ ! -d "$TAP_DIR" ]; then
    echo "Error: Homebrew tap directory not found at $TAP_DIR"
    exit 1
fi

# Copy the updated formula
cp homebrew-tap-files/Formula/ocsight.rb $TAP_DIR/Formula/ocsight.rb

echo "Formula copied. You need to manually:"
echo "1. cd $TAP_DIR"
echo "2. git add Formula/ocsight.rb"
echo "3. git commit -m 'Update ocsight formula with fixed v0.7.3 checksums'"
echo "4. git push"
echo "5. brew install heyhuynhgiabuu/tap/ocsight"

echo ""
echo "New checksums in the formula:"
echo "darwin-arm64: 30f123b32e319ad32b9929017fd76ac54210cdc70f5b1364b093f4b29c6df8f4"
echo "darwin-x64: 5f944a4bc3395d84e9768ec95c9f2abe64672397761d22a3cba282d54260a6b6"
echo "linux-arm64: 63bdd5320e0d940e7b81c664856c80a2d54ce84025efbe7d192b1ad65e7b15f1"
echo "linux-x64: fd15d563feaa3614cc8e61caa49bc1dc9f16f81151094055cfa2743cc30b7351"