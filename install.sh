#!/bin/bash

set -e

# Store original directory
ORIG_DIR="$PWD"

# Check if running as test mode
if [ "$1" = "--test" ]; then
    echo "Testing install script with local packages..."
    VERSION="local"
    ZIP_URL="file://$ORIG_DIR/ocsight-darwin-arm64.zip"
    INSTALL_DIR="$ORIG_DIR/test-install"
    mkdir -p "$INSTALL_DIR"
    echo "Test mode enabled"
else
    echo "Installing ocsight..."
fi

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case $OS in
    Darwin)
        PLATFORM="darwin"
        ;;
    Linux)
        PLATFORM="linux"
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

case $ARCH in
    x86_64|amd64)
        ARCH="x64"
        ;;
    arm64|aarch64)
        ARCH="arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Get latest version
if [ "$VERSION" != "local" ]; then
    VERSION=$(curl -s https://api.github.com/repos/heyhuynhgiabuu/ocsight/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$VERSION" ]; then
        echo "Failed to get latest version"
        exit 1
    fi
fi

echo "Installing ocsight $VERSION for $PLATFORM/$ARCH..."

# Download and install
if [ "$VERSION" = "local" ]; then
    ZIP_URL="file://$PWD/ocsight-$PLATFORM-$ARCH.zip"
else
    ZIP_URL="https://github.com/heyhuynhgiabuu/ocsight/releases/download/$VERSION/ocsight-$PLATFORM-$ARCH.zip"
fi

if [ "$VERSION" != "local" ]; then
    INSTALL_DIR="$HOME/.local/bin"
fi
TEMP_DIR=$(mktemp -d)

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download zip file
echo "Downloading from $ZIP_URL..."
if [ "$VERSION" = "local" ]; then
    cp "ocsight-$PLATFORM-$ARCH.zip" "$TEMP_DIR/ocsight.zip"
else
    curl -L -o "$TEMP_DIR/ocsight.zip" "$ZIP_URL"
fi

# Verify checksum if available
echo "Verifying integrity..."
cd "$TEMP_DIR"
if [ "$VERSION" = "local" ]; then
    CHECKSUMS_FILE="$ORIG_DIR/dist/checksums.txt"
    cp "$CHECKSUMS_FILE" checksums.txt
else
    curl -L -s "https://github.com/heyhuynhgiabuu/ocsight/releases/download/$VERSION/checksums.txt" -o checksums.txt
fi
if command -v sha256sum >/dev/null 2>&1; then
    EXPECTED_SHA=$(grep "ocsight-$PLATFORM-$ARCH.zip" checksums.txt | cut -d' ' -f1)
    ACTUAL_SHA=$(sha256sum ocsight.zip | cut -d' ' -f1)
    if [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
        echo "Checksum verification failed!"
        echo "Expected: $EXPECTED_SHA"
        echo "Actual: $ACTUAL_SHA"
        echo "This may indicate a corrupted download or tampered package."
        echo "Please try downloading again or report this issue."
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    echo "Checksum verified successfully"
else
    echo "sha256sum not available, skipping checksum verification"
    echo "WARNING: Installing without integrity verification is not recommended"
fi

# Extract zip
echo "Extracting..."
unzip -q ocsight.zip
cd ocsight-$PLATFORM-$ARCH

# Install binary and lib files
cp ocsight "$INSTALL_DIR/"
mkdir -p "$INSTALL_DIR/lib"
cp lib/index.js "$INSTALL_DIR/lib/"

# Make executable
chmod +x "$INSTALL_DIR/ocsight"

# Clean up
rm -rf "$TEMP_DIR"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "Adding $INSTALL_DIR to PATH..."
    
    # Detect current shell and update appropriate config
    if [ -n "$ZSH_VERSION" ]; then
        echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> ~/.zshrc
        echo "Please restart your shell or run: export PATH=\"$INSTALL_DIR:\$PATH\""
    elif [ -n "$BASH_VERSION" ]; then
        echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> ~/.bashrc
        echo "Please restart your shell or run: export PATH=\"$INSTALL_DIR:\$PATH\""
    else
        echo "Please add $INSTALL_DIR to your PATH manually"
    fi
fi

echo "ocsight $VERSION installed successfully!"
echo "Run 'ocsight --help' to get started."