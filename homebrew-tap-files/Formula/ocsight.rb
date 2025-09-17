class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "0.7.3"

  depends_on "node"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-x64.zip"
      sha256 "be685031f298997b326c425472647780a207a173e91e8da8cc230d193eda28c0"

      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-arm64.zip"
      sha256 "6d02a715bc0b11b2b68ac76b5875c96840b164f9bc8d825681cde37a672344fe"

      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
  end

  on_linux do
    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-x64.zip"
      sha256 "d19893b1e7589105115181083668bbe183224e04c8e10201d1a3a96ff301cd89"
      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-arm64.zip"
      sha256 "277d2f3fa4cf22a8a3a44749bb0c153084e88d0133da48728805bdcfc520c001"
      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
  end

  test do
    assert_match "OpenCode ecosystem observability platform", shell_output("#{bin}/ocsight --help")
  end
end