class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/killerkidbo/ocsight"
  url "https://github.com/killerkidbo/ocsight/archive/refs/tags/v0.5.2.tar.gz"
  sha256 "0000000000000000000000000000000000000000000000000000000000000000"
  license "MIT"

  depends_on "go" => :build
  depends_on "node" => :build

  def install
    # Build Go binary
    system "go", "build", *std_go_args(ldflags: "-s -w")
    
    # Copy JavaScript files
    libexec.install Dir["lib/*"]
    
    # Update binary to find JavaScript files
    bin.install_symlink "ocsight" => "ocsight"
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