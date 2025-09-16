#!/usr/bin/env bun
const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);
// @ts-ignore
import { $ } from "bun";

import pkg from "../package.json";

const dry = process.env["OCSIGHT_DRY"] === "true";
const version = process.env["OCSIGHT_VERSION"]!;
const snapshot = process.env["OCSIGHT_SNAPSHOT"] === "true";

console.log(`publishing ${version}`);

const targets = [
  ["linux", "arm64"],
  ["linux", "x64"],
  ["darwin", "x64"],
  ["darwin", "arm64"],
];

await $`rm -rf dist`;

const optionalDependencies: Record<string, string> = {};
const npmTag = snapshot ? "snapshot" : "latest";

for (const [os, arch] of targets) {
  console.log(`building ${os}-${arch}`);
  const name = `${pkg.name}-${os}-${arch}`;
  await $`mkdir -p dist/${name}`;

  // Build TypeScript to single binary using Bun
  console.log(`Building for ${os}-${arch} to dist/${name}/ocsight`);

  if (dry) {
    console.log(`Dry run: creating dummy binary for ${os}-${arch}`);
    // Create a dummy executable file for testing
    await $`echo "#!/bin/bash\necho 'ocsight ${version} (dummy)'" > dist/${name}/ocsight && chmod +x dist/${name}/ocsight`;
  } else {
    console.log(`Compiling with target: bun-${os}-${arch}`);
    await $`bun build --define OCSIGHT_VERSION="'${version}'" --compile --target=bun-${os}-${arch} --outfile=dist/${name}/ocsight ./src/index.ts`;
  }
  console.log(`Built dist/${name}/ocsight`);
  await $`ls -la dist/${name}/ocsight`.nothrow();

  // Run smoke test if on current platform and not dry run
  if (
    !dry &&
    process.platform === (os === "windows" ? "win32" : os) &&
    (process.arch === arch || (process.arch === "x64" && arch === "x64"))
  ) {
    console.log(`smoke test: running dist/${name}/ocsight --version`);
    await $`./dist/${name}/ocsight --version`;
  }

  // @ts-ignore
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version,
        os: [os === "windows" ? "win32" : os],
        cpu: [arch],
      },
      null,
      2,
    ),
  );

  if (!dry)
    await $`cd dist/${name} && bun publish --access public --tag ${npmTag}`;
  optionalDependencies[name] = version;
}

await $`mkdir -p ./dist/${pkg.name}`;
// @ts-ignore
await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name + "-cli",
      bin: {
        [pkg.name]: `ocsight`,
      },
      version,
      optionalDependencies,
    },
    null,
    2,
  ),
);
if (!dry)
  await $`cd ./dist/${pkg.name} && bun publish --access public --tag ${npmTag}`;

if (!snapshot) {
  for (const key of Object.keys(optionalDependencies)) {
    console.log(`Zipping dist/${key} to ../${key}.zip`);
    await $`ls -la dist/${key}`;
    await $`cd dist/${key} && zip -r ../${key}.zip *`;
  }

  // Calculate SHA values
  const arm64Sha =
    await $`sha256sum ./dist/ocsight-linux-arm64.zip | cut -d' ' -f1`
      .text()
      .then((x) => x.trim());
  const x64Sha = await $`sha256sum ./dist/ocsight-linux-x64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim());
  const macX64Sha =
    await $`sha256sum ./dist/ocsight-darwin-x64.zip | cut -d' ' -f1`
      .text()
      .then((x) => x.trim());
  const macArm64Sha =
    await $`sha256sum ./dist/ocsight-darwin-arm64.zip | cut -d' ' -f1`
      .text()
      .then((x) => x.trim());

  // Homebrew formula
  const homebrewFormula = [
    "# typed: false",
    "# frozen_string_literal: true",
    "",
    "class Ocsight < Formula",
    '  desc "OpenCode ecosystem observability platform"',
    '  homepage "https://github.com/heyhuynhgiabuu/ocsight"',
    `  version "${version}"`,
    "",
    "  on_macos do",
    "    if Hardware::CPU.intel?",
    `      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-darwin-x64.zip"`,
    `      sha256 "${macX64Sha}"`,
    "",
    "      def install",
    '        bin.install "ocsight"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm?",
    `      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-darwin-arm64.zip"`,
    `      sha256 "${macArm64Sha}"`,
    "",
    "      def install",
    '        bin.install "ocsight"',
    "      end",
    "    end",
    "  end",
    "",
    "  on_linux do",
    "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-linux-x64.zip"`,
    `      sha256 "${x64Sha}"`,
    "      def install",
    '        bin.install "ocsight"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-linux-arm64.zip"`,
    `      sha256 "${arm64Sha}"`,
    "      def install",
    '        bin.install "ocsight"',
    "      end",
    "    end",
    "  end",
    "end",
    "",
  ].join("\n");

  await $`rm -rf ./dist/homebrew-tap`;
  await $`git clone https://github.com/heyhuynhgiabuu/homebrew-tap.git ./dist/homebrew-tap`;
  // @ts-ignore
  await Bun.file("./dist/homebrew-tap/ocsight.rb").write(homebrewFormula);
  await $`cd ./dist/homebrew-tap && git add ocsight.rb`;
  await $`cd ./dist/homebrew-tap && git commit -m "Update to v${version}"`;
  if (!dry) await $`cd ./dist/homebrew-tap && git push`;
}
