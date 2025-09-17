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
    
    # Convert amd64 to x64 for consistency with package managers
    local zip_arch=$arch
    if [ "$arch" = "amd64" ]; then
        zip_arch="x64"
    fi
    
    echo "Building for $os/$arch..."
    
    GOOS=$os GOARCH=$arch go build \
        -ldflags="-X 'main.Version=$VERSION'" \
        -o "dist/ocsight-$os-$arch$suffix" \
        .
    
    # Create zip package
    echo "Creating zip package for $os/$zip_arch..."
    local pkg_dir="dist/pkg/ocsight-$os-$zip_arch"
    mkdir -p "$pkg_dir"
    
    # Copy binary as "ocsight" (without platform suffix)
    cp "dist/ocsight-$os-$arch$suffix" "$pkg_dir/ocsight$suffix"
    
    # Also copy as bundle.js for Homebrew compatibility
    cp dist-bundle/index.js "$pkg_dir/bundle.js"
    
    # Copy bundled JavaScript
    mkdir -p "$pkg_dir/lib"
    cp dist-bundle/index.js "$pkg_dir/lib/index.js"
    
    # Create zip
    cd dist/pkg
    zip -r "../ocsight-$os-$zip_arch.zip" "ocsight-$os-$zip_arch"
    cd ../..
}

# Clean dist directory
rm -rf dist dist-bundle
mkdir -p dist dist-bundle dist/pkg

# Build TypeScript and bundle JavaScript
echo "Building TypeScript and bundling JavaScript..."
bun run prepack

# Build binaries and create zips
build darwin amd64
build darwin arm64
build linux amd64
build linux arm64
build windows amd64

# Create checksums for zip files
echo "Creating checksums..."
cd dist
sha256sum -- *.zip > checksums.txt
cd ..

# Clean up temporary directories
rm -rf dist/pkg

echo "Build complete! Packages available in dist/"
echo "Version: $VERSION"
echo ""
echo "Packages created:"
ls -la dist/*.zip