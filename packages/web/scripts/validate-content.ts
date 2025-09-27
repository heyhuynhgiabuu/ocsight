#!/usr/bin/env bun
/**
 * Content validation script for ocsight documentation
 * Validates content collections, checks for broken links, and ensures quality standards
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const contentDir = join(__dirname, "../src/content");

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
  info: string[];
}

interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  filesWithErrors: number;
  filesWithWarnings: number;
  results: ValidationResult[];
}

/**
 * Main validation function
 */
async function validateContent(): Promise<ValidationSummary> {
  console.log("🔍 Starting content validation...\n");

  const results: ValidationResult[] = [];
  const collections = await getCollections();

  for (const collection of collections) {
    console.log(`📁 Validating collection: ${collection}`);
    const collectionResults = await validateCollection(collection);
    results.push(...collectionResults);
  }

  const summary = generateSummary(results);
  printSummary(summary);

  return summary;
}

/**
 * Get all content collections
 */
async function getCollections(): Promise<string[]> {
  try {
    const entries = await readdir(contentDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.error("❌ Error reading content directory:", error);
    return [];
  }
}

/**
 * Validate a specific collection
 */
async function validateCollection(
  collection: string,
): Promise<ValidationResult[]> {
  const collectionPath = join(contentDir, collection);
  const results: ValidationResult[] = [];

  try {
    const files = await getMarkdownFiles(collectionPath);

    for (const file of files) {
      const result = await validateFile(file, collection);
      results.push(result);
    }
  } catch (error) {
    console.error(`❌ Error validating collection ${collection}:`, error);
  }

  return results;
}

/**
 * Get all markdown files in a directory recursively
 */
async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (
        entry.isFile() &&
        [".md", ".mdx"].includes(extname(entry.name))
      ) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error);
  }

  return files;
}

/**
 * Validate a single file
 */
async function validateFile(
  filePath: string,
  collection: string,
): Promise<ValidationResult> {
  const relativePath = filePath.replace(contentDir, "").replace(/^\//, "");
  const result: ValidationResult = {
    file: relativePath,
    errors: [],
    warnings: [],
    info: [],
  };

  try {
    const content = await readFile(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    // Validate frontmatter
    validateFrontmatter(frontmatter, collection, result);

    // Validate content body
    validateBody(body, result);

    // Check file size
    const stats = await stat(filePath);
    if (stats.size > 100000) {
      // 100KB
      result.warnings.push(
        `Large file size: ${Math.round(stats.size / 1024)}KB`,
      );
    }
  } catch (error) {
    result.errors.push(`Failed to read file: ${error}`);
  }

  return result;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: any; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  try {
    // Simple YAML parsing for validation (in production, use a proper YAML parser)
    const frontmatterText = match[1];
    const frontmatter: any = {};

    frontmatterText.split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
      }
    });

    return { frontmatter, body: match[2] };
  } catch (error) {
    return { frontmatter: {}, body: match[2] };
  }
}

/**
 * Validate frontmatter based on collection schema
 */
function validateFrontmatter(
  frontmatter: any,
  collection: string,
  result: ValidationResult,
) {
  // Required fields for all collections
  if (!frontmatter.title) {
    result.errors.push("Missing required field: title");
  } else if (frontmatter.title.length < 3) {
    result.warnings.push("Title is very short (< 3 characters)");
  } else if (frontmatter.title.length > 100) {
    result.warnings.push("Title is very long (> 100 characters)");
  }

  if (!frontmatter.description) {
    result.errors.push("Missing required field: description");
  } else if (frontmatter.description.length < 10) {
    result.warnings.push("Description is very short (< 10 characters)");
  } else if (frontmatter.description.length > 300) {
    result.warnings.push("Description is very long (> 300 characters)");
  }

  // Collection-specific validation
  switch (collection) {
    case "docs":
      validateDocsFields(frontmatter, result);
      break;
    case "blog":
      validateBlogFields(frontmatter, result);
      break;
    case "changelog":
      validateChangelogFields(frontmatter, result);
      break;
    case "guides":
      validateGuidesFields(frontmatter, result);
      break;
  }
}

/**
 * Validate docs-specific fields
 */
function validateDocsFields(frontmatter: any, result: ValidationResult) {
  const validCategories = [
    "getting-started",
    "guides",
    "reference",
    "examples",
    "api",
  ];
  const validDifficulties = ["beginner", "intermediate", "advanced"];

  if (frontmatter.category && !validCategories.includes(frontmatter.category)) {
    result.errors.push(
      `Invalid category: ${frontmatter.category}. Must be one of: ${validCategories.join(", ")}`,
    );
  }

  if (
    frontmatter.difficulty &&
    !validDifficulties.includes(frontmatter.difficulty)
  ) {
    result.errors.push(
      `Invalid difficulty: ${frontmatter.difficulty}. Must be one of: ${validDifficulties.join(", ")}`,
    );
  }

  if (frontmatter.estimatedTime) {
    const time = parseInt(frontmatter.estimatedTime);
    if (isNaN(time) || time < 1 || time > 120) {
      result.errors.push(
        "estimatedTime must be a number between 1 and 120 minutes",
      );
    }
  }
}

/**
 * Validate blog-specific fields
 */
function validateBlogFields(frontmatter: any, result: ValidationResult) {
  if (!frontmatter.publishDate) {
    result.errors.push("Missing required field: publishDate");
  }

  const validCategories = ["update", "tutorial", "case-study", "announcement"];
  if (frontmatter.category && !validCategories.includes(frontmatter.category)) {
    result.errors.push(
      `Invalid category: ${frontmatter.category}. Must be one of: ${validCategories.join(", ")}`,
    );
  }
}

/**
 * Validate changelog-specific fields
 */
function validateChangelogFields(frontmatter: any, result: ValidationResult) {
  if (!frontmatter.version) {
    result.errors.push("Missing required field: version");
  }

  if (!frontmatter.releaseDate) {
    result.errors.push("Missing required field: releaseDate");
  }

  const validTypes = ["major", "minor", "patch", "prerelease"];
  if (frontmatter.type && !validTypes.includes(frontmatter.type)) {
    result.errors.push(
      `Invalid type: ${frontmatter.type}. Must be one of: ${validTypes.join(", ")}`,
    );
  }
}

/**
 * Validate guides-specific fields
 */
function validateGuidesFields(frontmatter: any, result: ValidationResult) {
  if (!frontmatter.estimatedTime) {
    result.warnings.push(
      "Missing estimatedTime field (recommended for guides)",
    );
  } else {
    const time = parseInt(frontmatter.estimatedTime);
    if (isNaN(time) || time < 5 || time > 180) {
      result.errors.push(
        "estimatedTime must be a number between 5 and 180 minutes",
      );
    }
  }

  const validDifficulties = ["beginner", "intermediate", "advanced"];
  if (
    frontmatter.difficulty &&
    !validDifficulties.includes(frontmatter.difficulty)
  ) {
    result.errors.push(
      `Invalid difficulty: ${frontmatter.difficulty}. Must be one of: ${validDifficulties.join(", ")}`,
    );
  }
}

/**
 * Validate content body
 */
function validateBody(body: string, result: ValidationResult) {
  // Check minimum content length
  if (body.trim().length < 100) {
    result.warnings.push("Content is very short (< 100 characters)");
  }

  // Check for common issues
  if (body.includes("TODO") || body.includes("FIXME")) {
    result.warnings.push("Contains TODO or FIXME comments");
  }

  // Check for broken internal links (basic check)
  const internalLinks = body.match(/\[([^\]]+)\]\(\/[^)]+\)/g) || [];
  if (internalLinks.length > 0) {
    result.info.push(`Found ${internalLinks.length} internal link(s)`);
  }

  // Check for code blocks
  const codeBlocks = body.match(/```[\s\S]*?```/g) || [];
  if (codeBlocks.length > 0) {
    result.info.push(`Found ${codeBlocks.length} code block(s)`);

    // Check for code blocks without language specification
    const unspecifiedBlocks = body.match(/```\n/g) || [];
    if (unspecifiedBlocks.length > 0) {
      result.warnings.push(
        `${unspecifiedBlocks.length} code block(s) without language specification`,
      );
    }
  }

  // Check heading structure
  const headings = body.match(/^#{1,6}\s+.+$/gm) || [];
  if (headings.length === 0) {
    result.warnings.push("No headings found - consider adding structure");
  }

  // Check for very long lines
  const lines = body.split("\n");
  const longLines = lines.filter((line) => line.length > 120);
  if (longLines.length > 0) {
    result.warnings.push(
      `${longLines.length} line(s) longer than 120 characters`,
    );
  }
}

/**
 * Generate validation summary
 */
function generateSummary(results: ValidationResult[]): ValidationSummary {
  const totalFiles = results.length;
  const filesWithErrors = results.filter((r) => r.errors.length > 0).length;
  const filesWithWarnings = results.filter((r) => r.warnings.length > 0).length;
  const validFiles = totalFiles - filesWithErrors;

  return {
    totalFiles,
    validFiles,
    filesWithErrors,
    filesWithWarnings,
    results,
  };
}

/**
 * Print validation summary
 */
function printSummary(summary: ValidationSummary) {
  console.log("\n📊 Validation Summary");
  console.log("=".repeat(50));
  console.log(`Total files: ${summary.totalFiles}`);
  console.log(`Valid files: ${summary.validFiles}`);
  console.log(`Files with errors: ${summary.filesWithErrors}`);
  console.log(`Files with warnings: ${summary.filesWithWarnings}`);

  if (summary.filesWithErrors > 0) {
    console.log("\n❌ Files with errors:");
    summary.results
      .filter((r) => r.errors.length > 0)
      .forEach((result) => {
        console.log(`\n  📄 ${result.file}`);
        result.errors.forEach((error) => console.log(`    ❌ ${error}`));
      });
  }

  if (summary.filesWithWarnings > 0) {
    console.log("\n⚠️  Files with warnings:");
    summary.results
      .filter((r) => r.warnings.length > 0)
      .forEach((result) => {
        console.log(`\n  📄 ${result.file}`);
        result.warnings.forEach((warning) => console.log(`    ⚠️  ${warning}`));
      });
  }

  console.log("\n✅ Validation complete!");

  if (summary.filesWithErrors > 0) {
    console.log("\n🚨 Please fix the errors above before proceeding.");
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.main) {
  validateContent().catch((error) => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
}

export { validateContent, type ValidationResult, type ValidationSummary };
