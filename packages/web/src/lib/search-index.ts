/**
 * Search index generation and management
 */

import type { SearchIndex } from "./search";

export interface ContentEntry {
  slug: string;
  data: {
    title: string;
    description?: string;
    tags?: string[];
    category?: string;
  };
  body: string;
  collection: string;
}

/**
 * Generate search index from content collections
 */
export function generateSearchIndex(content: ContentEntry[]): SearchIndex[] {
  return content.map((entry, index) => ({
    id: `${entry.collection}-${entry.slug}-${index}`,
    title: entry.data.title,
    content: cleanContent(entry.body),
    url: generateUrl(entry.collection, entry.slug),
    section: entry.data.category || entry.collection,
    tags: entry.data.tags || [],
    lastModified: new Date(),
  }));
}

/**
 * Clean and normalize content for search
 */
function cleanContent(content: string): string {
  return (
    content
      // Remove markdown syntax
      .replace(/#{1,6}\s+/g, "") // Headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
      .replace(/\*(.*?)\*/g, "$1") // Italic
      .replace(/`(.*?)`/g, "$1") // Inline code
      .replace(/```[\s\S]*?```/g, "") // Code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // Images
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Generate URL from collection and slug
 */
function generateUrl(collection: string, slug: string): string {
  const baseUrls: Record<string, string> = {
    docs: "/docs",
    blog: "/blog",
    changelog: "/changelog",
    guides: "/guides",
  };

  const baseUrl = baseUrls[collection] || `/${collection}`;
  return slug === "index" ? baseUrl : `${baseUrl}/${slug}`;
}

/**
 * Build search index from Astro content collections
 */
export async function buildSearchIndex(): Promise<SearchIndex[]> {
  // This would be called at build time to generate the search index
  // For now, return empty array as placeholder
  return [];
}

/**
 * Load search index (client-side)
 */
export async function loadSearchIndex(): Promise<SearchIndex[]> {
  try {
    const response = await fetch("/search-index.json");
    if (!response.ok) {
      throw new Error("Failed to load search index");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading search index:", error);
    return [];
  }
}

/**
 * Save search index to JSON file (build-time)
 */
export function saveSearchIndex(
  index: SearchIndex[],
  outputPath: string,
): void {
  if (typeof window !== "undefined") {
    console.warn("saveSearchIndex should only be called at build time");
    return;
  }

  try {
    // This would write to file system during build
    console.log(
      `Search index with ${index.length} entries would be saved to ${outputPath}`,
    );
  } catch (error) {
    console.error("Error saving search index:", error);
  }
}

/**
 * Update search index incrementally
 */
export function updateSearchIndex(
  currentIndex: SearchIndex[],
  newContent: ContentEntry[],
): SearchIndex[] {
  const newEntries = generateSearchIndex(newContent);

  // Remove old entries for updated content
  const updatedSlugs = new Set(newContent.map((c) => c.slug));
  const filteredIndex = currentIndex.filter(
    (entry) => !updatedSlugs.has(entry.id.split("-")[1]),
  );

  return [...filteredIndex, ...newEntries];
}

/**
 * Validate search index
 */
export function validateSearchIndex(index: SearchIndex[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  index.forEach((entry, i) => {
    if (!entry.id) errors.push(`Entry ${i}: Missing id`);
    if (!entry.title) errors.push(`Entry ${i}: Missing title`);
    if (!entry.url) errors.push(`Entry ${i}: Missing url`);
    if (!entry.content) errors.push(`Entry ${i}: Missing content`);
    if (!entry.section) errors.push(`Entry ${i}: Missing section`);
  });

  // Check for duplicate IDs
  const ids = index.map((entry) => entry.id);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
