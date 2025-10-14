class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "1.2.2"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.2/ocsight-darwin-arm64.zip"
      sha256 "3afa122f10e02f3e89d9d39b5ea7fbf750e348056b9fc29ce2f2f25a244390db"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.2/ocsight-darwin-x64.zip"
      sha256 "51970e8ca7ab4bc0f60abe0b13912f77c9bbadf30c6209bdc06df2bf7d36e513"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.2/ocsight-linux-arm64.zip"
      sha256 "77582124a26af2569c0d0ef37390b0061503885bfbd3ea0d263dd230dda16a04"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.2/ocsight-linux-x64.zip"
      sha256 "357e3d78afbbfc109f4259df6cb1e33ce2928820426729cf40e9a64a10cdda96"
    end
  end

  depends_on "node" => ">=18"

  def install
    libexec.install Dir["*"]
    # Create executable wrapper for the bundled CLI
    (bin/"ocsight").write <<~EOS
      #!/bin/bash
      exec node "#{libexec}/bundle.cjs" "$@"
    EOS
  end

  test do
    system bin/"ocsight", "--version"
  end
end