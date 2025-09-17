const esbuild = require("esbuild");
const fs = require("fs");

esbuild
  .build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist-bundle/index.js",
    external: [],
    minify: false,
    sourcemap: false,
    target: "node18",
  })
  .then(() => {
    // Read the generated file
    let content = fs.readFileSync("dist-bundle/index.js", "utf8");
    
    // Remove the problematic module.exports line at the end
    content = content.replace(/0 && \(module\.exports = \{[^}]*\}\);/g, '');
    
    // Add shebang only if it doesn't already exist
    if (!content.startsWith("#!/usr/bin/env node")) {
      content = "#!/usr/bin/env node\n" + content;
    }
    
    // Write back the content
    fs.writeFileSync("dist-bundle/index.js", content);
    
    // Make executable
    fs.chmodSync("dist-bundle/index.js", "755");
  })
  .catch(() => process.exit(1));
