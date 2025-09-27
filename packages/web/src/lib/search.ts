/**
 * Search functionality with instant results and analytics
 */

export interface SearchIndex {
  id: string;
  title: string;
  content: string;
  url: string;
  section: string;
  tags: string[];
  lastModified?: Date;
}

export interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
  section: string;
  score: number;
  highlights?: string[];
}

export interface SearchConfig {
  maxResults: number;
  excerptLength: number;
  highlightTag: string;
  minQueryLength: number;
}

const defaultConfig: SearchConfig = {
  maxResults: 10,
  excerptLength: 150,
  highlightTag: "mark",
  minQueryLength: 2,
};

/**
 * Simple search implementation using fuzzy matching
 */
export class SearchEngine {
  private index: SearchIndex[] = [];
  private config: SearchConfig;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Add documents to search index
   */
  addDocuments(documents: SearchIndex[]) {
    this.index = [...this.index, ...documents];
  }

  /**
   * Clear search index
   */
  clearIndex() {
    this.index = [];
  }

  /**
   * Search documents
   */
  search(query: string): SearchResult[] {
    if (query.length < this.config.minQueryLength) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results: Array<SearchIndex & { score: number }> = [];

    this.index.forEach((doc) => {
      const score = this.calculateScore(doc, searchTerms);
      if (score > 0) {
        results.push({ ...doc, score });
      }
    });

    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, this.config.maxResults);

    // Convert to SearchResult format
    return topResults.map((doc) => ({
      title: doc.title,
      excerpt: this.generateExcerpt(doc.content, searchTerms),
      url: doc.url,
      section: doc.section,
      score: doc.score,
      highlights: this.findHighlights(doc.content, searchTerms),
    }));
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateScore(doc: SearchIndex, searchTerms: string[]): number {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    const tagsLower = doc.tags.map((tag) => tag.toLowerCase());

    searchTerms.forEach((term) => {
      // Title matches (highest weight)
      if (titleLower.includes(term)) {
        score += titleLower === term ? 100 : 50;
      }

      // Tag matches (high weight)
      tagsLower.forEach((tag) => {
        if (tag.includes(term)) {
          score += tag === term ? 30 : 15;
        }
      });

      // Content matches (lower weight)
      const contentMatches = (contentLower.match(new RegExp(term, "g")) || [])
        .length;
      score += contentMatches * 5;

      // Boost for exact phrase matches
      if (contentLower.includes(searchTerms.join(" "))) {
        score += 25;
      }
    });

    return score;
  }

  /**
   * Generate excerpt with highlighted terms
   */
  private generateExcerpt(content: string, searchTerms: string[]): string {
    const { excerptLength } = this.config;

    // Find the best position to start excerpt (around first match)
    let startPos = 0;
    const contentLower = content.toLowerCase();

    for (const term of searchTerms) {
      const pos = contentLower.indexOf(term);
      if (pos !== -1) {
        startPos = Math.max(0, pos - excerptLength / 3);
        break;
      }
    }

    // Extract excerpt
    let excerpt = content.slice(startPos, startPos + excerptLength);

    // Clean up excerpt boundaries
    if (startPos > 0) {
      const spaceIndex = excerpt.indexOf(" ");
      if (spaceIndex > 0) {
        excerpt = "..." + excerpt.slice(spaceIndex);
      }
    }

    if (startPos + excerptLength < content.length) {
      const lastSpaceIndex = excerpt.lastIndexOf(" ");
      if (lastSpaceIndex > 0) {
        excerpt = excerpt.slice(0, lastSpaceIndex) + "...";
      }
    }

    return excerpt.trim();
  }

  /**
   * Find highlighted terms in content
   */
  private findHighlights(content: string, searchTerms: string[]): string[] {
    const highlights: string[] = [];

    searchTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches);
      }
    });

    return [...new Set(highlights)]; // Remove duplicates
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery: string, limit = 5): string[] {
    if (partialQuery.length < 2) return [];

    const suggestions = new Set<string>();
    const queryLower = partialQuery.toLowerCase();

    this.index.forEach((doc) => {
      // Check title words
      doc.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.startsWith(queryLower) && word.length > queryLower.length) {
            suggestions.add(word);
          }
        });

      // Check tags
      doc.tags.forEach((tag) => {
        if (tag.toLowerCase().startsWith(queryLower)) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular search terms (mock implementation)
   */
  getPopularTerms(): string[] {
    return [
      "installation",
      "getting started",
      "CLI commands",
      "configuration",
      "troubleshooting",
      "API reference",
      "examples",
    ];
  }
}

/**
 * Search analytics tracking
 */
export class SearchAnalytics {
  private queries: Array<{ query: string; timestamp: Date; results: number }> =
    [];

  /**
   * Track search query
   */
  trackQuery(query: string, resultCount: number) {
    this.queries.push({
      query: query.toLowerCase(),
      timestamp: new Date(),
      results: resultCount,
    });

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000);
    }
  }

  /**
   * Get popular queries
   */
  getPopularQueries(limit = 10): Array<{ query: string; count: number }> {
    const queryCount = new Map<string, number>();

    this.queries.forEach(({ query }) => {
      queryCount.set(query, (queryCount.get(query) || 0) + 1);
    });

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get queries with no results
   */
  getNoResultQueries(limit = 10): string[] {
    return this.queries
      .filter(({ results }) => results === 0)
      .map(({ query }) => query)
      .slice(-limit);
  }

  /**
   * Get search statistics
   */
  getStats() {
    const totalQueries = this.queries.length;
    const uniqueQueries = new Set(this.queries.map((q) => q.query)).size;
    const noResultQueries = this.queries.filter((q) => q.results === 0).length;
    const avgResults =
      this.queries.reduce((sum, q) => sum + q.results, 0) / totalQueries;

    return {
      totalQueries,
      uniqueQueries,
      noResultQueries,
      noResultRate: noResultQueries / totalQueries,
      avgResults,
    };
  }
}

// Global search instances
export const searchEngine = new SearchEngine();
export const searchAnalytics = new SearchAnalytics();
