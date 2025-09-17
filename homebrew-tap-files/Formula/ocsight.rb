class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "0.7.3"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-arm64.zip"
      sha256 "30f123b32e319ad32b9929017fd76ac54210cdc70f5b1364b093f4b29c6df8f4"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-darwin-x64.zip"
      sha256 "5f944a4bc3395d84e9768ec95c9f2abe64672397761d22a3cba282d54260a6b6"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-arm64.zip"
      sha256 "63bdd5320e0d940e7b81c664856c80a2d54ce84025efbe7d192b1ad65e7b15f1"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.3/ocsight-linux-x64.zip"
      sha256 "fd15d563feaa3614cc8e61caa49bc1dc9f16f81151094055cfa2743cc30b7351"
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