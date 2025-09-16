#!/usr/bin/env bun

import { $ } from "bun";

if (process.versions.bun !== "1.2.21") {
  throw new Error("This script requires bun@1.2.21");
}

console.log("=== publishing ===\n");

const snapshot = process.env["OCSIGHT_SNAPSHOT"] === "true";
const version = await (async () => {
  if (snapshot)
    return `0.0.0-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
  const [major, minor, patch] = (
    await $`gh release list --limit 1 --json tagName --jq '.[0].tagName'`.text()
  )
    .trim()
    .replace(/^v/, "")
    .split(".")
    .map((x) => Number(x) || 0);
  const t = process.env["OCSIGHT_BUMP"]?.toLowerCase();
  if (t === "major") return `${major + 1}.0.0`;
  if (t === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
})();
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
await import(`../packages/ocsight/script/publish.ts`);

console.log("\n=== release ===\n");

if (!snapshot) {
  await $`git commit -am "release: v${version}"`;
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

  await $`gh release create v${version} --title "v${version}" --notes ${notes} ./packages/ocsight/dist/*.zip`;
}
