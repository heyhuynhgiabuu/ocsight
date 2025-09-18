class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "0.7.5"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.5/ocsight-darwin-arm64.zip"
      sha256 "2a5464b40b94cc15dfddc6d42b3cda209f46fada0e5cb58f4b06d3b3c33dd00f"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.5/ocsight-darwin-x64.zip"
      sha256 "51970e8ca7ab4bc0f60abe0b13912f77c9bbadf30c6209bdc06df2bf7d36e513"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.5/ocsight-linux-arm64.zip"
      sha256 "d52b7c8c137b2d13067fd00fb4fad2050c96c7f208a1926c3fc2cfe7bec6a319"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v0.7.5/ocsight-linux-x64.zip"
      sha256 "357e3d78afbbfc109f4259df6cb1e33ce2928820426729cf40e9a64a10cdda96"
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