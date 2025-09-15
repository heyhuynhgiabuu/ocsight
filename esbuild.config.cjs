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
    
    // Write back and add shebang
    fs.writeFileSync("dist-bundle/index.js", "#!/usr/bin/env node\n" + content);
    
    // Make executable
    fs.chmodSync("dist-bundle/index.js", "755");
  })
  .catch(() => process.exit(1));
