#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

console.log("=== publishing ===\n");

const snapshot = process.env["OCSIGHT_SNAPSHOT"] === "true";
const dry = process.env["OCSIGHT_DRY"] === "true";
const version =
  process.env["OCSIGHT_VERSION"] ||
  JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).version;
process.env["OCSIGHT_VERSION"] = version;
console.log("version:", version);

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd, encoding: "utf8" }).trim();
}

async function fetchJson(url: string, options?: any): Promise<any> {
  const { default: fetch } = await import("node-fetch");
  const response = await fetch(url, options);
  return response.json();
}

async function updateHomebrew(version: string) {
  const { updateHomebrew } = await import("./update-homebrew.js");
  await updateHomebrew(version);
}

// Update package.json version
const pkgPath = join(process.cwd(), "package.json");
const pkgContent = readFileSync(pkgPath, "utf8");
const updatedPkg = pkgContent.replace(
  new RegExp(`"version": "[^"]+"`, "g"),
  `"version": "${version}"`,
);
writeFileSync(pkgPath, updatedPkg);
console.log("updated: package.json");

console.log("\n=== building ===\n");
run("bun run prepack");
run(`./build.sh`);

console.log("\n=== release ===\n");

if (!snapshot && !dry) {
  // Check if there are any changes to commit
  try {
    run("git diff --cached --exit-code");
    run("git diff --exit-code");
  } catch (e) {
    run(`git commit -am "release: v${version}"`);
  }

  run(`git tag -f v${version}`);
  run("git fetch origin");
  try {
    run("git cherry-pick HEAD..origin/develop");
  } catch (e) {
    console.log("No changes to cherry-pick from origin/develop");
  }
  run("git push origin HEAD --tags --no-verify --force");

  const previous = await fetchJson(
    "https://api.github.com/repos/heyhuynhgiabuu/ocsight/releases/latest",
  ).then((data: any) => data.tag_name);

  console.log("finding commits between", previous, "and", "HEAD");
  const commits = await fetchJson(
    `https://api.github.com/repos/heyhuynhgiabuu/ocsight/compare/${previous}...HEAD`,
  ).then((data: any) => data.commits || []);

  const raw = commits.map(
    (commit: any) => `- ${commit.commit.message.split("\n").join(" ")}`,
  );
  console.log(raw);

  const notes =
    raw
      .filter((x: string) => {
        const lower = x.toLowerCase();
        return (
          !lower.includes("release:") &&
          !lower.includes("ignore:") &&
          !lower.includes("chore:") &&
          !lower.includes("ci:") &&
          !lower.includes("wip:") &&
          !lower.includes("docs:") &&
          !lower.includes("doc:")
        );
      })
      .join("\n") || "No notable changes";

  const zipFiles = [
    "dist/ocsight-linux-arm64.zip",
    "dist/ocsight-linux-x64.zip",
    "dist/ocsight-darwin-x64.zip",
    "dist/ocsight-darwin-arm64.zip",
    "dist/ocsight-windows-x64.zip",
    "dist/checksums.txt",
  ].join(" ");

  if (process.argv.includes("--dry-run")) {
    console.log(
      `[DRY RUN] Would publish npm package and create release: gh release create v${version} --title "v${version}" --notes "${notes}" ${zipFiles}`,
    );
  } else {
    // Publish npm package first
    console.log("📦 Publishing npm package...");
    run(`npm publish --access public --otp=${process.env.NPM_OTP || ""}`);

    // Create GitHub release
    run(
      `gh release create v${version} --title "v${version}" --notes "${notes}" ${zipFiles}`,
    );

    // Update Homebrew formula
    console.log("🍺 Updating Homebrew formula...");
    await updateHomebrew(version);
  }
}

export {};
