const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');

const RAG_API_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL ||
  API_URL;

export interface Article {
  id: string;
  keyword: string;
  headline: string;
  summary: string[];
  contentBlocks?: string[];
  sectionHeadings?: string[];
  highlightedFacts?: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
  imageUrl?: string;
  imageUrls?: string[];
  enrichmentStatus?: 'pending' | 'complete';
  createdAt: string;
  updatedAt?: string;
  viewCount24h?: number;
}

export interface FetchNewsResponse {
  success: boolean;
  source: 'cache' | 'database';
  data: Article[];
}

export interface IngestTriggerResponse {
  success: boolean;
  status: 'processing';
  message: string;
  scope?: 'general' | 'search';
  query?: string;
}

export type IngestJobStatus = 'idle' | 'processing' | 'scraping' | 'complete' | 'error';

export interface IngestStatusResponse {
  success: boolean;
  status: IngestJobStatus;
  message: string;
  scope?: 'general' | 'search';
  query?: string;
  startedAt?: string;
  completedAt?: string;
  ingestedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  error?: string;
}

export interface IngestResult {
  success: boolean;
  message: string;
  ingestedCount: number;
  skippedCount: number;
  errorsCount: number;
}

export interface RagSearchResult {
  articleId: string;
  headline: string;
  keyword: string;
  categories: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral' | string;
  createdAt: string;
  updatedAt: string;
  articleUrl: string;
  chunkType: 'headline' | 'summary' | 'paragraph';
  chunkPosition: number;
  chunkContent: string;
  similarity: number;
}

export interface RagChatSource extends RagSearchResult {
  snippet: string;
}

export interface RagChatResponse {
  success: boolean;
  query: string;
  answer: string;
  suggestions: string[];
  sources: RagSearchResult[];
}

export interface RagCoverageStats {
  totalArticles: number;
  indexedArticles: number;
  missingArticles: number;
  totalChunks: number;
  chunksByType: Record<string, number>;
  coveragePercent: number;
  lastIndexedAt: string | null;
}

export interface RagJobStatus {
  status: 'idle' | 'processing' | 'complete' | 'error';
  message: string;
  startedAt?: string;
  completedAt?: string;
  indexedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  totalCount?: number;
  error?: string;
}

export interface RagStatusResponse {
  success: boolean;
  coverage: RagCoverageStats;
  status: RagJobStatus;
  running: boolean;
}

export interface IngestPollOptions {
  search?: string;
  useRagApi?: boolean;
}

const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the latest news articles from the backend API.
 */
export async function fetchNews(category?: string, search?: string): Promise<Article[]> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'Home') {
      params.append('category', category);
    }
    if (search) {
      params.append('search', search);
    }
    const queryString = params.toString();
    const url = queryString ? `${API_URL}/api/news?${queryString}` : `${API_URL}/api/news`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('[API] fetchNews error:', error);
    return [];
  }
}

/**
 * Poll ingestion status until complete, error, or timeout.
 */
export async function pollIngestStatus(
  options?: IngestPollOptions,
  onTick?: (status: IngestStatusResponse) => void
): Promise<IngestResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const status = await fetchIngestStatus(options);
    
    if (onTick) {
      onTick(status);
    }

    if (status.status === 'complete') {
      return {
        success: true,
        message: status.message,
        ingestedCount: status.ingestedCount ?? 0,
        skippedCount: status.skippedCount ?? 0,
        errorsCount: status.errorsCount ?? 0,
      };
    }

    if (status.status === 'error') {
      return {
        success: false,
        message: status.message || 'Ingestion failed.',
        ingestedCount: status.ingestedCount ?? 0,
        skippedCount: status.skippedCount ?? 0,
        errorsCount: status.errorsCount ?? 0,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    success: false,
    message: 'Ingestion timed out. Try refreshing in a moment.',
    ingestedCount: 0,
    skippedCount: 0,
    errorsCount: 0,
  };
}

export async function fetchIngestStatus(options?: IngestPollOptions): Promise<IngestStatusResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.search) {
      params.append('search', options.search);
    }
    const queryString = params.toString();
    const baseUrl = options?.useRagApi ? RAG_API_URL : API_URL;
    const url = queryString
      ? `${baseUrl}/api/news/ingest/status?${queryString}`
      : `${baseUrl}/api/news/ingest/status`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('[API] fetchIngestStatus error:', error);
    return {
      success: false,
      status: 'error',
      message: error.message || 'Failed to fetch ingestion status.',
    };
  }
}

/**
 * Start background ingestion (202 Accepted) and wait for completion via polling.
 */
export async function triggerIngest(
  category?: string,
  country?: string,
  search?: string,
  onStatus?: (status: IngestStatusResponse) => void
): Promise<IngestResult> {
  try {
    let url = `${API_URL}/api/news/ingest`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (country) params.append('country', country);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 202 && !response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    await response.json();
    return await pollIngestStatus({ search }, onStatus);
  } catch (error: any) {
    console.error('[API] triggerIngest error:', error);
    return {
      success: false,
      message: error.message || 'Failed to trigger ingestion pipeline.',
      ingestedCount: 0,
      skippedCount: 0,
      errorsCount: 0,
    };
  }
}

/**
 * Fetch a single article by its ID (includes full content).
 */
export async function fetchArticleById(id: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] fetchArticleById error:', error);
    return null;
  }
}

/**
 * Triggers on-demand scraping and AI enrichment for a single article stub.
 */
export async function enrichArticleById(id: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] enrichArticleById error:', error);
    return null;
  }
}

/**
 * Update the active cover image of an article.
 */
export async function updateArticleImage(id: string, imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    if (!response.ok) return false;
    const res = await response.json();
    return res.success;
  } catch (error) {
    console.error('[API] updateArticleImage error:', error);
    return false;
  }
}

/**
 * Record a page view for an article in the database.
 */
export async function recordArticleView(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/news/${id}/view`, {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    console.error('[API] recordArticleView error:', error);
    return false;
  }
}

/**
 * Fetch dashboard statistics for administrator.
 */
export async function fetchAdminStats(adminEmail: string): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/api/admin/stats`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': adminEmail
      }
    });
    if (!response.ok) {
      throw new Error(`Stats fetch failed with status ${response.status}`);
    }
    const res = await response.json();
    return res.success ? res.stats : null;
  } catch (error) {
    console.error('[API] fetchAdminStats error:', error);
    return null;
  }
}

/**
 * Create a news article manually (Admin).
 */
export async function createArticle(article: Partial<Article>, adminEmail: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/admin/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': adminEmail
      },
      body: JSON.stringify(article)
    });
    if (!response.ok) {
      throw new Error(`Article creation failed: ${response.statusText}`);
    }
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] createArticle error:', error);
    return null;
  }
}

/**
 * Update an article manually (Admin).
 */
export async function updateArticle(id: string, article: Partial<Article>, adminEmail: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': adminEmail
      },
      body: JSON.stringify(article)
    });
    if (!response.ok) {
      throw new Error(`Article update failed: ${response.statusText}`);
    }
    const res = await response.json();
    return res.success ? res.data : null;
  } catch (error) {
    console.error('[API] updateArticle error:', error);
    return null;
  }
}

/**
 * Delete an article (Admin).
 */
export async function deleteArticle(id: string, adminEmail: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/admin/news/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Email': adminEmail
      }
    });
    if (!response.ok) return false;
    const res = await response.json();
    return res.success;
  } catch (error) {
    console.error('[API] deleteArticle error:', error);
    return false;
  }
}

/**
 * Clear Redis cache entirely (Admin).
 */
export async function clearRedisCache(adminEmail: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/admin/clear-cache`, {
      method: 'POST',
      headers: {
        'X-Admin-Email': adminEmail
      }
    });
    if (!response.ok) return false;
    const res = await response.json();
    return res.success;
  } catch (error) {
    console.error('[API] clearRedisCache error:', error);
    return false;
  }
}

export async function fetchRagStatus(adminEmail: string): Promise<RagStatusResponse | null> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/admin/rag/status`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': adminEmail,
      },
    });
    if (!response.ok) {
      throw new Error(`RAG status fetch failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[API] fetchRagStatus error:', error);
    return null;
  }
}

export async function triggerRagBackfill(adminEmail: string, limit = 25): Promise<RagStatusResponse | null> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/admin/rag/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Email': adminEmail,
      },
      body: JSON.stringify({ limit }),
    });
    if (!response.ok && response.status !== 202) {
      throw new Error(`RAG backfill failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[API] triggerRagBackfill error:', error);
    return null;
  }
}

export async function searchRagArticles(query: string, category?: string, limit = 8): Promise<RagSearchResult[]> {
  try {
    const params = new URLSearchParams();
    params.append('q', query);
    if (category) params.append('category', category);
    params.append('limit', String(limit));
    const response = await fetch(`${RAG_API_URL}/api/rag/search?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`RAG search failed with status ${response.status}`);
    }
    const res = await response.json();
    return res.success && Array.isArray(res.results) ? res.results : [];
  } catch (error) {
    console.error('[API] searchRagArticles error:', error);
    return [];
  }
}

export async function chatWithRag(options: {
  query: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  category?: string;
  limit?: number;
}): Promise<RagChatResponse | null> {
  try {
    const response = await fetch(`${RAG_API_URL}/api/rag/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: options.query,
        history: options.history || [],
        category: options.category,
        limit: options.limit,
      }),
    });
    if (!response.ok) {
      throw new Error(`RAG chat failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[API] chatWithRag error:', error);
    return null;
  }
}
