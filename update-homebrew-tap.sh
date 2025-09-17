#!/bin/bash

# Script to update the Homebrew tap formula
# This needs to be run manually because it modifies files outside the project

TAP_FORMULA="/opt/homebrew/Library/Taps/heyhuynhgiabuu/homebrew-tap/Formula/ocsight.rb"
LOCAL_FORMULA="./homebrew-tap-files/Formula/ocsight.rb"

echo "Updating Homebrew tap formula..."
echo "Source: $LOCAL_FORMULA"
echo "Target: $TAP_FORMULA"

if [ -f "$LOCAL_FORMULA" ]; then
    echo "Copying updated formula to tap..."
    cp "$LOCAL_FORMULA" "$TAP_FORMULA"
    echo "✅ Formula updated successfully!"
    
    echo "Now you can:"
    echo "1. Uninstall current version: brew uninstall ocsight"
    echo "2. Install new version: brew install heyhuynhgiabuu/tap/ocsight"
    echo "3. Test version: ocsight --version"
else
    echo "❌ Local formula not found at $LOCAL_FORMULA"
    exit 1
fi