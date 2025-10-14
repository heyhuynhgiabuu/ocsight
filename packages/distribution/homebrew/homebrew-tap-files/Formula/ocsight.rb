class Ocsight < Formula
  desc "OpenCode ecosystem observability platform"
  homepage "https://github.com/heyhuynhgiabuu/ocsight"
  version "1.2.1"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.1/ocsight-darwin-arm64.zip"
      sha256 "13405d07908ca87193d3ee684d6f28a21f40c7d546924d5e37b9bd67680adf0c"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.1/ocsight-darwin-x64.zip"
      sha256 "51970e8ca7ab4bc0f60abe0b13912f77c9bbadf30c6209bdc06df2bf7d36e513"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.1/ocsight-linux-arm64.zip"
      sha256 "2be33ed9c5459352cb947efdd9a0a5a24f5faf3bc3998867d8e9d0a4a30b7bb1"
    else
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v1.2.1/ocsight-linux-x64.zip"
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