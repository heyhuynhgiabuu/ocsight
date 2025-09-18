#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

async function updateHomebrew(version) {
  console.log(`🍺 Updating Homebrew formula to v${version}...`);

  const projectRoot = process.cwd();
  const homebrewPath = join(projectRoot, "homebrew-tap");
  const formulaPath = join(homebrewPath, "Formula", "ocsight.rb");

  // Download and calculate checksums for all platforms
  const platforms = [
    { os: "darwin", arch: "arm64" },
    { os: "darwin", arch: "x64" },
    { os: "linux", arch: "arm64" },
    { os: "linux", arch: "x64" },
  ];

  const checksums = {};

  for (const { os, arch } of platforms) {
    const url = `https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-${os}-${arch}.zip`;
    console.log(`Calculating checksum for ${os}-${arch}...`);

    try {
      // Download file temporarily
      const tempFile = `/tmp/ocsight-${os}-${arch}.zip`;
      execSync(`curl -L -s -o ${tempFile} ${url}`);

      // Calculate SHA256
      const buffer = readFileSync(tempFile);
      const hash = createHash("sha256").update(buffer).digest("hex");
      checksums[`${os}-${arch}`] = hash;

      // Clean up
      execSync(`rm -f ${tempFile}`);
      console.log(`✓ ${os}-${arch}: ${hash}`);
    } catch (error) {
      console.error(`❌ Failed to download ${os}-${arch}:`, error.message);
      process.exit(1);
    }
  }

  // Read current formula
  const formula = readFileSync(formulaPath, "utf8");

  // Update formula content
  let updatedFormula = formula
    .replace(/version "[^"]+"/g, `version "${version}"`)
    .replace(
      /url "https:\/\/github\.com\/heyhuynhgiabuu\/ocsight\/releases\/download\/v[^\/]+\/ocsight-darwin-arm64\.zip"/g,
      `url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-darwin-arm64.zip"`,
    )
    .replace(
      /url "https:\/\/github\.com\/heyhuynhgiabuu\/ocsight\/releases\/download\/v[^\/]+\/ocsight-darwin-x64\.zip"/g,
      `url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-darwin-x64.zip"`,
    )
    .replace(
      /url "https:\/\/github\.com\/heyhuynhgiabuu\/ocsight\/releases\/download\/v[^\/]+\/ocsight-linux-arm64\.zip"/g,
      `url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-linux-arm64.zip"`,
    )
    .replace(
      /url "https:\/\/github\.com\/heyhuynhgiabuu\/ocsight\/releases\/download\/v[^\/]+\/ocsight-linux-x64\.zip"/g,
      `url "https://github.com/heyhuynhgiabuu/ocsight/releases/download/v${version}/ocsight-linux-x64.zip"`,
    );

  // Update SHA256 checksums
  const platformMap = {
    "darwin-arm64": "darwin.*arm",
    "darwin-x64": "darwin.*else",
    "linux-arm64": "linux.*arm",
    "linux-x64": "linux.*else",
  };

  for (const [platform, checksum] of Object.entries(checksums)) {
    const regex = new RegExp(
      `(${platformMap[platform]}[\\s\\S]*?sha256 ")[^"]+(")`,
    );
    updatedFormula = updatedFormula.replace(regex, `$1${checksum}$2`);
  }

  // Write updated formula
  writeFileSync(formulaPath, updatedFormula);
  console.log("✓ Updated Formula/ocsight.rb");

  // Commit and push to homebrew-tap
  try {
    execSync("git add .", { cwd: homebrewPath });
    execSync(`git commit -m "Update ocsight to v${version}"`, {
      cwd: homebrewPath,
    });
    execSync("git push origin main", { cwd: homebrewPath });
    console.log("✓ Pushed to homebrew-tap repository");
  } catch (error) {
    console.error("❌ Failed to update homebrew-tap:", error.message);
    process.exit(1);
  }

  console.log(`🍺 Homebrew formula updated to v${version}!`);
}

// Export for use in publish.ts
export { updateHomebrew };

// Allow direct execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const version = process.argv[2] || process.env.OCSIGHT_VERSION;
  if (!version) {
    console.error("Usage: node scripts/update-homebrew.js <version>");
    console.error(
      "   or: OCSIGHT_VERSION=x.x.x node scripts/update-homebrew.js",
    );
    process.exit(1);
  }
  updateHomebrew(version).catch(console.error);
}
