class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "0.7.3"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-arm64.zip"
      sha256 "e58d58dae76dcbd650da35e0bf35e5e59113168deab07c384d8107c54707e9c2"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-x64.zip"
      sha256 "bb7298162af7d4a32a14d6abafce39ef2ec494eb226772461e408d1afb8645a3"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-arm64.zip"
      sha256 "782ad98e72f112700208ceeb6f316b34dd36df7f92cca010c90febef235eb0a0"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-x64.zip"
      sha256 "e3d443e757a50776afc199125d8469eaf4f48e9586c8c333506b79a130880db6"
    end
  end

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"ocsight"
  end

  test do
    system bin/"ocsight", "--version"
  end
end