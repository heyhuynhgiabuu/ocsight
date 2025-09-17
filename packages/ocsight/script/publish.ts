#!/usr/bin/env bun

import { $ } from "bun";

if (process.versions.bun !== "1.2.19") {
  throw new Error("This script requires bun@1.2.19");
}

console.log("=== publishing ===\n");

const snapshot = process.env["OCSIGHT_SNAPSHOT"] === "true";
const version = process.env["OCSIGHT_VERSION"] || "0.7.1";
process.env["OCSIGHT_VERSION"] = version;
console.log("version:", version);

const pkgjsons = await Array.fromAsync(
  new Bun.Glob("**/package.json").scan({
    absolute: true,
  }),
).then((arr) =>
  arr.filter((x) => !x.includes("node_modules") && !x.includes("dist")),
);

for (const file of pkgjsons) {
  let pkg = await Bun.file(file).text();
  pkg = pkg.replaceAll(/"version": "[^"]+"/g, `"version": "${version}"`);
  console.log("updated:", file);
  await Bun.file(file).write(pkg);
}

console.log("\n=== ocsight ===\n");

const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);

import pkg from "../package.json";

const dry = process.env["OCSIGHT_DRY"] === "true";

// Store original directory for proper path resolution
const originalDir = process.cwd();

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
    try {
      const currentDir = process.cwd();
      process.chdir(`dist/${name}`);
      console.log(`Publishing ${name} with OTP...`);
      await $`npm publish --access public --tag ${npmTag} ${otp ? `--otp ${otp}` : ""}`;
      console.log(`✅ Successfully published ${name}`);
      process.chdir(currentDir);
    } catch (error) {
      console.log(`❌ Failed to publish ${name}: ${error}`);
      process.chdir(originalDir);
      // Don't continue with other packages if npm publish fails due to auth issues
      if (error.toString().includes('EOTP') || error.toString().includes('E401')) {
        throw error;
      }
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

const sourceFile = `dist/${sourceDir}/ocsight`;
console.log(`Checking if source file exists: ${sourceFile}`);
try {
  await $`ls -la ${sourceFile}`.nothrow();
  console.log(`Source file found, copying...`);
  await $`cp ${sourceFile} ./dist/${pkg.name}/ocsight`;
} catch {
  console.log(`Source file not found, looking for alternative locations...`);

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
  try {
    const currentDir = process.cwd();
    process.chdir(`./dist/${pkg.name}`);
    console.log(`Publishing CLI package @heyhuynhgiabuu/${pkg.name}-cli with OTP...`);
    await $`npm publish --access public --tag ${npmTag} ${otp ? `--otp ${otp}` : ""}`;
    console.log(`✅ Successfully published CLI package`);
    process.chdir(currentDir);
  } catch (error) {
    console.log(`❌ Failed to publish CLI package: ${error}`);
    process.chdir(originalDir);
    if (error.toString().includes('EOTP') || error.toString().includes('E401')) {
      throw error;
    }
  }
}

if (!snapshot) {
  for (const key of Object.keys(optionalDependencies)) {
    console.log(
      `Zipping dist/${key} to ${key.replace("@heyhuynhgiabuu/", "")}.zip`,
    );

    const distPath = `dist/${key}`;
    console.log(`Checking directory: ${distPath}`);

    try {
      await $`ls -la ${distPath}`;
      console.log(`Directory found, proceeding with zip...`);

      const currentDir = process.cwd();
      process.chdir(distPath);
      const zipName = key.replace("@heyhuynhgiabuu/", "");
      console.log(`Creating zip file: ./dist/${zipName}.zip`);
      await $`zip -r ${currentDir}/dist/${zipName}.zip *`;
      process.chdir(currentDir);
      console.log(`Successfully created ${zipName}.zip`);
    } catch (error) {
      console.log(`Failed to zip ${key}: ${error}`);
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(`Available directories in dist:`);
      await $`ls -la dist/`.nothrow();
    }
  }
}

console.log("\n=== release ===\n");

if (!snapshot && !dry) {
  // Check if there are any changes to commit
  const { exitCode: statusCode } =
    await $`git diff --cached --exit-code`.nothrow();
  const { exitCode: workingTreeCode } = await $`git diff --exit-code`.nothrow();

  if (statusCode !== 0 || workingTreeCode !== 0) {
    await $`git commit -am "release: v${version}"`;
  } else {
    console.log("No changes to commit, skipping commit step");
  }

  await $`git tag -f v${version}`;
  await $`git fetch origin`;
  await $`git cherry-pick HEAD..origin/dev`.nothrow();
  await $`git push origin HEAD --tags --no-verify --force`;

  const previous = await fetch(
    "https://api.github.com/repos/heyhuynhgiabuu/ocsight/releases/latest",
  )
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then((data) => data.tag_name);

  console.log("finding commits between", previous, "and", "HEAD");
  const commits = await fetch(
    `https://api.github.com/repos/heyhuynhgiabuu/ocsight/compare/${previous}...HEAD`,
  )
    .then((res) => res.json())
    .then((data) => data.commits || []);

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
    "./packages/ocsight/dist/ocsight-linux-arm64.zip",
    "./packages/ocsight/dist/ocsight-linux-x64.zip",
    "./packages/ocsight/dist/ocsight-darwin-x64.zip",
    "./packages/ocsight/dist/ocsight-darwin-arm64.zip",
  ].join(" ");

  await $`gh release create v${version} --title "v${version}" --notes ${notes} ${zipFiles}`;
}
