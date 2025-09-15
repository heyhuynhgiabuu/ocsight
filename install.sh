#!/bin/bash

set -e

echo "Installing ocsight..."

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
        ARCH="amd64"
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
VERSION=$(curl -s https://api.github.com/repos/killerkidbo/ocsight/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
    echo "Failed to get latest version"
    exit 1
fi

echo "Installing ocsight $VERSION for $PLATFORM/$ARCH..."

# Download and install
BINARY_URL="https://github.com/killerkidbo/ocsight/releases/download/$VERSION/ocsight-$PLATFORM-$ARCH"
INSTALL_DIR="$HOME/.local/bin"
BINARY_PATH="$INSTALL_DIR/ocsight"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
echo "Downloading from $BINARY_URL..."
curl -L -o "$BINARY_PATH" "$BINARY_URL"

# Make executable
chmod +x "$BINARY_PATH"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "Adding $INSTALL_DIR to PATH..."
    echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> ~/.bashrc
    echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> ~/.zshrc
    echo "Please restart your shell or run: export PATH=\"$INSTALL_DIR:\$PATH\""
fi

echo "ocsight $VERSION installed successfully!"
echo "Run 'ocsight --help' to get started."