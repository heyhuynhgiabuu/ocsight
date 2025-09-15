# typed: false
# frozen_string_literal: true

# typed: false
# frozen_string_literal: true

class Ocsight < Formula
  desc "OpenCode observability platform with real-time analytics, MCP server, caching, streaming, and multi-format exports"
  homepage "https://ocsight.dev"
  version "0.2.0"

  on_macos do
    if Hardware::CPU.intel?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/#{version}/ocsight-darwin-x64.zip"
      sha256 "3250b37fffa27a0b019827ebb8d5cf5feedb557626ee72b2419b988f65049920"

      def install
        bin.install "ocsight-macos-x64" => "ocsight"
      end
    end
    if Hardware::CPU.arm?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/#{version}/ocsight-darwin-arm64.zip"
      sha256 "a09574dd9bd6b7ab9583d63c905e1e61cb88c00d9df319f6a087357b4e62ba75"

      def install
        bin.install "ocsight-macos-arm64" => "ocsight"
      end
    end
  end

  on_linux do
    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/#{version}/ocsight-linux-x64.zip"
      sha256 "12d50c54e18d2d04dd9ac763123a13ef48fbabf802d5d85aec8d0ad73a05babc"
      def install
        bin.install "ocsight-linux-x64" => "ocsight"
      end
    end
    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?
      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/#{version}/ocsight-linux-arm64.zip"
      sha256 "7e6fd6d3b3e48465c8e44a321351a440f494a4356f56d5152d6b98bfb9077de7"
      def install
        bin.install "ocsight-linux-arm64" => "ocsight"
      end
    end
  end
end