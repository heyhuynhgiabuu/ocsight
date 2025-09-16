class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  url "https://github.com/heyhuynhgiabuu/ocsight/archive/refs/tags/v0.6.3.tar.gz"
  sha256 "aa191000f68e433e5de567dc8f7c40fddfe4ac4b16f972ac400ab78142791354"
  license "MIT"

  depends_on "go" => :build
  depends_on "node" => :build

  def install
    # Install Node.js dependencies
    system "npm", "install"

    # Build TypeScript
    system "npm", "run", "build"

    # Build Go binary for the current platform
    system "go", "build", "-ldflags", "-X main.Version=v#{version}", "-o", "ocsight", "."

    # Install binary
    bin.install "ocsight"

    # Install JavaScript files and dependencies that the Go binary needs
    (lib/"ocsight").install Dir["dist/lib/**/*"]
    (lib/"ocsight").install "dist/index.js"
    (lib/"ocsight").install "package.json"
    (lib/"ocsight").install "node_modules"
  end

  test do
    assert_match "ocsight", shell_output("#{bin}/ocsight --version")
    assert_match "OpenCode ecosystem observability platform", shell_output("#{bin}/ocsight --help")
  end

  livecheck do
    url :stable
    regex(/^v?(\d+(?:\.\d+)+)$/i)
  end
end