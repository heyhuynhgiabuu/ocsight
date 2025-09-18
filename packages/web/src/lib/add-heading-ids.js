import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

function addHeadingIds(content) {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => {
    const id = slugify(title);
    return `${hashes} ${title} {#${id}}`;
  });
}

function processDirectory(dirPath) {
  const files = readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dirPath, file.name);

    if (file.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.name.endsWith(".md")) {
      console.log(`Processing ${fullPath}`);
      const content = readFileSync(fullPath, "utf8");
      const updatedContent = addHeadingIds(content);
      writeFileSync(fullPath, updatedContent, "utf8");
    }
  }
}

// Process the docs directory
processDirectory("./src/content/docs");
console.log("Heading IDs added to all markdown files");
