#!/bin/bash

# Setup script for creating the homebrew tap repository
# Run this after creating the heyhuynhgiabuu/homebrew-tap repository on GitHub

set -e

echo "Setting up homebrew tap repository..."

# Check if we're in the right directory
if [ ! -d "homebrew-tap-files" ]; then
    echo "Error: homebrew-tap-files directory not found. Run this from the ocsight root directory."
    exit 1
fi

# Create the tap repository (you need to create this on GitHub first)
echo "1. Create a new repository on GitHub named 'homebrew-tap' under your account"
echo "2. Clone it locally:"
echo "   git clone https://github.com/heyhuynhgiabuu/homebrew-tap.git"
echo "   cd homebrew-tap"
echo ""
echo "3. Copy the tap files:"
echo "   cp -r ../ocsight/homebrew-tap-files/* ."
echo ""
echo "4. Update the SHA256 hashes in Formula/ocsight.rb with actual values from the release"
echo "5. Commit and push:"
echo "   git add ."
echo "   git commit -m 'Add ocsight formula'"
echo "   git push origin main"
echo ""
echo "6. Users can then install with:"
echo "   brew tap heyhuynhgiabuu/tap"
echo "   brew install ocsight"

echo ""
echo "Tap files created in homebrew-tap-files/ directory"
echo "Ready to copy to https://github.com/heyhuynhgiabuu/homebrew-tap"