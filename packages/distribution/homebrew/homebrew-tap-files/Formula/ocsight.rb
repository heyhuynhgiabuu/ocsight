class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "1.2.0"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.0/ocsight-darwin-arm64.zip"
      sha256 "0c2cda673f93136284518c7f2086d911a91209e8c2c13dbfc807e158c79b96f0"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.0/ocsight-darwin-x64.zip"
      sha256 "51970e8ca7ab4bc0f60abe0b13912f77c9bbadf30c6209bdc06df2bf7d36e513"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.0/ocsight-linux-arm64.zip"
      sha256 "82c8bfcd4355528c22edf59acd60aa184d2f1d7ff1b35713814662cf44c33c79"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.0/ocsight-linux-x64.zip"
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