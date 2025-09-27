#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

async function main() {
  const version = process.argv[2] || "patch";
  const otp = process.env.NPM_OTP;

  if (!version) {
    console.error(
      "Usage: node scripts/bump-version.js <major|minor|patch|version>",
    );
    process.exit(1);
  }

  if (!otp) {
    console.error("NPM_OTP environment variable required");
    process.exit(1);
  }

  const validVersions = ["major", "minor", "patch"];
  if (version !== "version" && !validVersions.includes(version)) {
    console.error("Version must be major, minor, patch, or version");
    process.exit(1);
  }

  console.log(`🚀 Releasing ocsight with ${version} bump...`);

  // Get current version from npm
  const scriptDir = __dirname;
  const projectRoot = path.join(scriptDir, "..");

  function getNpmVersion() {
    return new Promise((resolve, reject) => {
      const child = spawn(
        "npm",
        ["view", "@heyhuynhgiabuu/ocsight", "version"],
        {
          stdio: "pipe",
        },
      );

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          // Fallback to local package.json if npm command fails
          try {
            const localPackage = JSON.parse(
              fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
            );
            resolve(localPackage.version);
          } catch (error) {
            reject(error);
          }
        }
      });

      child.on("error", (error) => {
        // Fallback to local package.json if spawn fails
        try {
          const localPackage = JSON.parse(
            fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
          );
          resolve(localPackage.version);
        } catch (err) {
          reject(error);
        }
      });
    });
  }

  // Get current version
  const currentVersion = await getNpmVersion();
  console.log(`Current published version: ${currentVersion}`);

  // Calculate new version
  let newVersion;
  if (version === "version") {
    newVersion = currentVersion;
  } else {
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    if (version === "major") {
      newVersion = `${major + 1}.0.0`;
    } else if (version === "minor") {
      newVersion = `${major}.${minor + 1}.0`;
    } else {
      newVersion = `${major}.${minor}.${patch + 1}`;
    }
  }

  console.log(`New version: ${newVersion}`);

  // Update package files
  const packageFiles = [
    "package.json",
    "packages/cli/package.json",
    "packages/web/package.json",
  ];

  for (const file of packageFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
      pkg.version = newVersion;
      fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${file}`);
    }
  }

  // Run publish script
  console.log("📦 Running publish script...");
  const publishProcess = spawn(
    "bun",
    [path.join(projectRoot, "scripts/publish.ts")],
    {
      env: {
        ...process.env,
        OCSIGHT_VERSION: newVersion,
        NPM_OTP: otp,
      },
      stdio: "inherit",
      cwd: projectRoot,
    },
  );

  publishProcess.on("exit", (code) => {
    if (code === 0) {
      console.log("✅ Release complete!");
    } else {
      console.error(`❌ Publish failed with code ${code}`);
      process.exit(code);
    }
  });
}

main().catch(console.error);
