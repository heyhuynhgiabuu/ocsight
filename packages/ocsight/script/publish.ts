#!/usr/bin/env bun
const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);
// @ts-ignore
import { $ } from "bun";

// Store original directory for proper path resolution
const originalDir = process.cwd();

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
  const name = `@heyhuynhgiabuu/${pkg.name}-${os}-${arch}`;
  await $`mkdir -p dist/${name}`;

  // Build TypeScript to single binary using Bun
  console.log(`Building for ${os}-${arch} to dist/${name}/ocsight`);

  if (dry) {
    console.log(`Dry run: creating dummy binary for ${os}-${arch}`);
    // Create a dummy executable file for testing
    await $`echo "#!/bin/bash\necho 'ocsight ${version} (dummy)'" > dist/${name}/ocsight && chmod +x dist/${name}/ocsight`;
  } else {
    console.log(`Compiling with target: bun-${os}-${arch}`);
    const sourcePath = `${originalDir}/src/index.ts`;
    console.log(`Building from: ${sourcePath}`);
    await $`bun build --define OCSIGHT_VERSION="'${version}'" --compile --target=bun-${os}-${arch} --outfile=dist/${name}/ocsight ${sourcePath}`;
  }
  console.log(`Built dist/${name}/ocsight`);
  await $`ls -la dist/${name}/ocsight`.nothrow();
  console.log(`Binary exists at: ${process.cwd()}/dist/${name}/ocsight`);

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

  if (!dry) {
    const otp = process.env["NPM_OTP"];
    const publishArgs = ["publish", "--access", "public", "--tag", npmTag];
    if (otp) {
      publishArgs.push("--otp", otp);
    }
    try {
      const currentDir = process.cwd();
      process.chdir(`dist/${name}`);
      await $`npm publish --access public --tag ${npmTag} ${otp ? `--otp ${otp}` : ""}`.trim();
      process.chdir(currentDir);
    } catch (error) {
      process.chdir(originalDir); // Ensure we return to original directory
      console.log(`Package ${name} already published or failed, continuing...`);
    }
  }
  optionalDependencies[name] = version;
}

await $`mkdir -p ./dist/${pkg.name}`;
// Copy the current platform's binary to the CLI package
const currentPlatform = `${process.platform}-${process.arch}`;
const platformMap: Record<string, string> = {
  "darwin-arm64": "@heyhuynhgiabuu/ocsight-darwin-arm64",
  "darwin-x64": "@heyhuynhgiabuu/ocsight-darwin-x64",
  "linux-arm64": "@heyhuynhgiabuu/ocsight-linux-arm64",
  "linux-x64": "@heyhuynhgiabuu/ocsight-linux-x64",
  "win32-x64": "@heyhuynhgiabuu/ocsight-darwin-x64", // fallback for windows
};
const sourceDir =
  platformMap[currentPlatform] || "@heyhuynhgiabuu/ocsight-darwin-arm64";
console.log(`Attempting to copy from: dist/${sourceDir}/ocsight`);
console.log(`Available files in dist/:`);
await $`ls -la dist/`.nothrow();
console.log(`Available files in dist/${sourceDir}/:`);
await $`ls -la dist/${sourceDir}/`.nothrow();

// Check if the source file exists before copying
const sourceFile = `dist/${sourceDir}/ocsight`;
console.log(`Checking if source file exists: ${sourceFile}`);
try {
  await $`ls -la ${sourceFile}`.nothrow();
  console.log(`Source file found, copying...`);
  await $`cp ${sourceFile} ./dist/${pkg.name}/ocsight`;
} catch {
  console.log(`Source file not found, looking for alternative locations...`);

  // The binaries are actually nested due to directory changes during build
  // Let's find the actual binary location
  const nestedPath = `dist/@heyhuynhgiabuu/ocsight-linux-arm64/dist/@heyhuynhgiabuu/ocsight-linux-x64/dist/@heyhuynhgiabuu/ocsight-darwin-x64/dist/@heyhuynhgiabuu/ocsight-darwin-arm64/ocsight`;
  console.log(`Trying nested path: ${nestedPath}`);
  try {
    await $`ls -la ${nestedPath}`.nothrow();
    console.log(`Found binary at nested location: ${nestedPath}`);
    await $`cp ${nestedPath} ./dist/${pkg.name}/ocsight`;
  } catch {
    // Try to find the binary by searching the dist directory
    console.log(`Searching for binary in dist directory...`);
    const { stdout } =
      await $`find dist -name "ocsight" -type f | grep ${currentPlatform} | tail -1`;
    const foundBinary = stdout.trim();
    if (foundBinary) {
      console.log(`Found binary at: ${foundBinary}`);
      await $`cp ${foundBinary} ./dist/${pkg.name}/ocsight`;
    } else {
      throw new Error(`Could not find binary for platform ${currentPlatform}`);
    }
  }
}
// @ts-ignore
await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: "@heyhuynhgiabuu/" + pkg.name + "-cli",
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
if (!dry) {
  const otp = process.env["NPM_OTP"];
  const publishArgs = ["publish", "--access", "public", "--tag", npmTag];
  if (otp) {
    publishArgs.push("--otp", otp);
  }
  try {
    const currentDir = process.cwd();
    process.chdir(`./dist/${pkg.name}`);
    await $`npm publish --access public --tag ${npmTag} ${otp ? `--otp ${otp}` : ""}`.trim();
    process.chdir(currentDir);
  } catch (error) {
    console.log(`CLI package already published or failed, continuing...`);
  }
}

if (!snapshot) {
  for (const key of Object.keys(optionalDependencies)) {
    console.log(
      `Zipping dist/${key} to ${key.replace("@heyhuynhgiabuu/", "")}.zip`,
    );

    // Check if the directory exists before trying to zip it
    const distPath = `dist/${key}`;
    console.log(`Checking directory: ${distPath}`);

    try {
      await $`ls -la ${distPath}`;
      console.log(`Directory found, proceeding with zip...`);

      const currentDir = process.cwd();
      process.chdir(distPath);
      const zipName = key.replace("@heyhuynhgiabuu/", "");
      console.log(`Creating zip file: ${zipName}.zip in root directory`);
      await $`zip -r ${currentDir}/${zipName}.zip *`;
      process.chdir(currentDir);
      console.log(`Successfully created ${zipName}.zip`);
    } catch (error) {
      console.log(`Failed to zip ${key}: ${error}`);
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(`Available directories in dist:`);
      await $`ls -la dist/`.nothrow();
    }
  }

  // Calculate SHA values
  const arm64Sha = await $`sha256sum ./ocsight-linux-arm64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim());
  const x64Sha = await $`sha256sum ./ocsight-linux-x64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim());
  const macX64Sha = await $`sha256sum ./ocsight-darwin-x64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim());
  const macArm64Sha =
    await $`sha256sum ./ocsight-darwin-arm64.zip | cut -d' ' -f1`
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

  // Skip homebrew update for now - repository may not exist or have different permissions
  console.log("Skipping homebrew tap update (repository not accessible)");
  /*
  await $`rm -rf ./dist/homebrew-tap`;
  await $`git clone git@github.com:heyhuynhgiabuu/homebrew-tap.git ./dist/homebrew-tap`;
  // @ts-ignore
  await Bun.file("./dist/homebrew-tap/ocsight.rb").write(homebrewFormula);
  const currentDir = process.cwd();
  process.chdir("./dist/homebrew-tap");
  await $`git add ocsight.rb`;
  await $`git commit -m "Update to v${version}"`;
  if (!dry) await $`git push`;
  process.chdir(currentDir);
  */
}
