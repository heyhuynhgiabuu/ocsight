#!/usr/bin/env bun

import { $ } from "bun";

console.log("=== publishing ===\n");

const snapshot = process.env["OCSIGHT_SNAPSHOT"] === "true";
const dry = process.env["OCSIGHT_DRY"] === "true";
const version = process.env["OCSIGHT_VERSION"] || "0.7.2";
process.env["OCSIGHT_VERSION"] = version;
console.log("version:", version);

const pkgjsons = await Array.fromAsync(
  new Bun.Glob("**/package.json").scan({
    absolute: true,
  }),
).then((arr: string[]) =>
  arr.filter((x: string) => !x.includes("node_modules") && !x.includes("dist")),
);

for (const file of pkgjsons) {
  let pkg = await Bun.file(file).text();
  pkg = pkg.replaceAll(/"version": "[^"]+"/g, `"version": "${version}"`);
  console.log("updated:", file);
  await Bun.file(file).write(pkg);
}

console.log("\n=== ocsight ===\n");
await import(`${process.cwd()}/packages/ocsight/script/publish.ts`);

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

  await $`git tag v${version}`;
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
    "packages/ocsight/dist/ocsight-linux-arm64.zip",
    "packages/ocsight/dist/ocsight-linux-x64.zip",
    "packages/ocsight/dist/ocsight-darwin-x64.zip",
    "packages/ocsight/dist/ocsight-darwin-arm64.zip",
  ].join(" ");

  await $`gh release create v${version} --title "v${version}" --notes ${notes} ${zipFiles}`;
}
