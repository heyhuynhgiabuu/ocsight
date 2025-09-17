class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "0.7.1"

  depends_on "node"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.1/ocsight-darwin-x64.zip"
      sha256 "8df951e3e4e25bf85f308e59c866d6a42a3bbd3c27d8048f6b38b008c9721d38"

      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.1/ocsight-darwin-arm64.zip"
      sha256 "685a62f4949bbde3a0e2520914fa4751747072b555e705a9ebd4685c042fc45b"

      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
  end

  on_linux do
    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.1/ocsight-linux-x64.zip"
      sha256 "71e59c0cb39f9e9c3cfb84c66b321919753d5b6828e351ca4d08da602c308237"
      def install
        libexec.install "ocsight"
        libexec.install "bundle.js"
        (bin/"ocsight").write_env_script libexec/"ocsight", NODE_PATH: libexec
      end
    end
    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.1/ocsight-linux-arm64.zip"
      sha256 "068bd1ab8b66a22790a29d84d7237a9260d7963c52d648a966852892d8b2616"
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