class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  url "https://github.com/heyhuynhgiabuu/ocsight/archive/refs/tags/v0.6.0.tar.gz"
  sha256 "5b29db9566f2dffaebf7c3517ee22d5ceb91c5886e908dc852861d75eadbf109"
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

    # Install JavaScript files that the Go binary needs
    (lib/"ocsight").mkpath
    cp_r Dir["dist/lib/**/*"], lib/"ocsight"
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