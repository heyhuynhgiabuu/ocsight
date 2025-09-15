#!/bin/bash

set -e

VERSION=${1:-$(node -p "require('./package.json').version")}

echo "Building ocsight v$VERSION..."

# Build for different platforms
build() {
    local os=$1
    local arch=$2
    local suffix=""
    
    if [ "$os" = "windows" ]; then
        suffix=".exe"
    fi
    
    echo "Building for $os/$arch..."
    
    GOOS=$os GOARCH=$arch go build \
        -ldflags="-X 'main.Version=$VERSION'" \
        -o "dist/ocsight-$os-$arch$suffix" \
        .
}

# Clean dist directory
rm -rf dist
mkdir -p dist

# Build binaries
build darwin amd64
build darwin arm64
build linux amd64
build linux arm64
build windows amd64

# Build TypeScript and copy JavaScript files to dist/lib
echo "Building TypeScript..."
bun run build

echo "Copying JavaScript files..."
mkdir -p dist/lib

# Copy all JavaScript files from dist to dist/lib
cp -r dist/*.js dist/lib/ 2>/dev/null || echo "Warning: No JavaScript files found in dist/"

# Copy all directories from dist to dist/lib
for dir in commands lib mcp types; do
    if [ -d "dist/$dir" ]; then
        cp -r "dist/$dir" "dist/lib/" 2>/dev/null || echo "Warning: Failed to copy $dir directory"
    fi
done

# Copy package.json to dist/lib so JavaScript can find it
cp package.json dist/lib/

# Create checksums
echo "Creating checksums..."
cd dist
sha256sum ocsight-* > checksums.txt
cd ..

echo "Build complete! Binaries available in dist/"
echo "Version: $VERSION"