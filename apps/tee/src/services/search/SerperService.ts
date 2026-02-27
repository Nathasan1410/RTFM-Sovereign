/**
 * Serper API Service - Google Search API for Web Research
 * 
 * Provides live web search capabilities to LLM agents for:
 * - Documentation lookup
 * - Latest API references
 * - Current best practices
 * - Real-time information retrieval
 * 
 * @module services/search/SerperService
 */

import axios from 'axios';
import { logger } from '../../utils/logger';

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
  date?: string;
  source?: string;
}

export interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  website?: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface SerperSearchResponse {
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  organic: SerperSearchResult[];
  knowledgeGraph?: SerperKnowledgeGraph;
  relatedSearches?: Array<{ query: string }>;
  totalResults?: number;
}

export class SerperService {
  private apiKey: string;
  private endpoint = 'https://google.serper.dev/search';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Perform a Google search via Serper API
   * 
   * @param query - Search query
   * @param numResults - Number of results to return (default: 10)
   * @returns Search results with titles, links, and snippets
   */
  async search(query: string, numResults: number = 10): Promise<SerperSearchResponse> {
    try {
      logger.info({ query, numResults }, 'Serper: Performing search');

      const response = await axios.post(
        this.endpoint,
        {
          q: query,
          num: numResults
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const data = response.data;

      logger.info({
        query,
        resultsCount: data.organic?.length || 0,
        hasKnowledgeGraph: !!data.knowledgeGraph
      }, 'Serper: Search completed');

      return {
        searchParameters: data.searchParameters,
        organic: data.organic || [],
        knowledgeGraph: data.knowledgeGraph,
        relatedSearches: data.relatedSearches,
        totalResults: data.totalResults
      };

    } catch (error) {
      logger.error({
        error: (error as Error).message,
        query
      }, 'Serper: Search failed');
      throw error;
    }
  }

  /**
   * Search for documentation specifically
   * 
   * @param topic - Topic to search documentation for
   * @param site - Optional site filter (e.g., 'react.dev', 'mdn')
   * @returns Curated documentation results
   */
  async searchDocs(topic: string, site?: string): Promise<SerperSearchResult[]> {
    try {
      const query = site 
        ? `${topic} documentation site:${site}`
        : `${topic} documentation official`;

      logger.info({ topic, site, query }, 'Serper: Searching for documentation');

      const results = await this.search(query, 8);

      // Filter for high-quality documentation sources
      const docResults = results.organic.filter(result => {
        const url = result.link.toLowerCase();
        return (
          url.includes('docs') ||
          url.includes('documentation') ||
          url.includes('developer.mozilla.org') ||
          url.includes('github.com') ||
          url.includes('react.dev') ||
          url.includes('typescriptlang.org') ||
          url.includes('stackoverflow.com')
        );
      });

      logger.info({ 
        topic, 
        totalResults: results.organic.length,
        docResults: docResults.length 
      }, 'Serper: Documentation results filtered');

      return docResults.slice(0, 5);

    } catch (error) {
      logger.error({ error: (error as Error).message, topic }, 'Serper: Doc search failed');
      return [];
    }
  }

  /**
   * Get quick answer from knowledge graph
   * 
   * @param query - Search query
   * @returns Knowledge graph information if available
   */
  async getQuickAnswer(query: string): Promise<string | null> {
    try {
      const results = await this.search(query, 5);
      
      if (results.knowledgeGraph?.description) {
        return results.knowledgeGraph.description;
      }

      // Fallback to first organic result snippet
      return results.organic[0]?.snippet || null;

    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Serper: Quick answer failed');
      return null;
    }
  }

  /**
   * Search for latest updates on a topic
   * 
   * @param topic - Topic to search updates for
   * @returns Recent search results
   */
  async searchLatest(topic: string): Promise<SerperSearchResult[]> {
    try {
      logger.info({ topic }, 'Serper: Searching for latest updates');

      const results = await this.search(`${topic} 2025 2026 latest`, 10);

      // Sort by date if available
      const datedResults = results.organic
        .filter(r => r.date)
        .sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });

      return datedResults.slice(0, 5);

    } catch (error) {
      logger.error({ error: (error as Error).message, topic }, 'Serper: Latest search failed');
      return [];
    }
  }

  /**
   * Format search results for LLM context
   * 
   * @param results - Search results to format
   * @returns Formatted string for LLM prompt
   */
  formatResultsForLLM(results: SerperSearchResult[]): string {
    if (!results || results.length === 0) {
      return 'No relevant documentation found.';
    }

    return results.map((result, index) => {
      return `[${index + 1}] ${result.title}\n    URL: ${result.link}\n    Summary: ${result.snippet}`;
    }).join('\n\n');
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.search('test', 1);
      return true;
    } catch {
      return false;
    }
  }
}
