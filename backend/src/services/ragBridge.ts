import {
  indexArticleIfPossible as localIndexArticleIfPossible,
  retrieveArticlesForQuery as localRetrieveArticlesForQuery,
  buildRagAnswer as localBuildRagAnswer,
  getRagCoverageStats as localGetRagCoverageStats,
  backfillMissingArticleChunks as localBackfillMissingArticleChunks,
} from './ragService';
import { getRagJobState as localGetRagJobState, resetRagJobState as localResetRagJobState } from './ragStatus';
import type { RagArticleLike, RagChatHistoryMessage, RagSearchResult } from './ragService';

const RAG_SERVICE_URL = (process.env.RAG_SERVICE_URL || '').replace(/\/$/, '');
const RAG_ADMIN_EMAIL = process.env.RAG_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'aryasuraj351@gmail.com';

function hasRemoteRagService(): boolean {
  return Boolean(RAG_SERVICE_URL);
}

function ragUrl(path: string): string {
  if (!RAG_SERVICE_URL) {
    throw new Error('RAG_SERVICE_URL is not configured.');
  }
  return `${RAG_SERVICE_URL}${path}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`RAG service responded with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Email': RAG_ADMIN_EMAIL,
  };
}

export async function indexArticleInRag(article: RagArticleLike): Promise<boolean> {
  if (hasRemoteRagService()) {
    try {
      const result = await postJson<{ success: boolean }>(ragUrl('/api/rag/index'), { article });
      return Boolean(result.success);
    } catch (error) {
      console.error('[RAGBridge] Remote index failed, falling back to local index:', error);
    }
  }

  return localIndexArticleIfPossible(article);
}

export async function retrieveArticlesForQuery(
  query: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<RagSearchResult[]> {
  if (hasRemoteRagService()) {
    try {
      const params = new URLSearchParams();
      params.set('q', query);
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.category) params.set('category', options.category);
      const response = await fetch(ragUrl(`/api/rag/search?${params.toString()}`), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`RAG search failed with status ${response.status}`);
      }
      const result = await response.json();
      return result.success && Array.isArray(result.results) ? result.results : [];
    } catch (error) {
      console.error('[RAGBridge] Remote retrieval failed, falling back to local search:', error);
    }
  }

  return localRetrieveArticlesForQuery(query, options);
}

export async function buildRagAnswer(
  query: string,
  history: RagChatHistoryMessage[],
  sources: RagSearchResult[]
): Promise<{ answer: string; suggestions: string[] }> {
  if (hasRemoteRagService()) {
    try {
      const result = await postJson<{ success: boolean; answer: string; suggestions: string[] }>(
        ragUrl('/api/rag/chat'),
        { query, history, sources }
      );
      return {
        answer: result.answer || '',
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      };
    } catch (error) {
      console.error('[RAGBridge] Remote chat failed, falling back to local answer generation:', error);
    }
  }

  return localBuildRagAnswer(query, history, sources);
}

export async function getRagCoverageStats() {
  if (hasRemoteRagService()) {
    try {
      const response = await fetch(ragUrl('/api/admin/rag/status'), {
        cache: 'no-store',
        headers: adminHeaders(),
      });
      if (!response.ok) {
        throw new Error(`RAG status failed with status ${response.status}`);
      }
      const result = await response.json();
      return result.coverage;
    } catch (error) {
      console.error('[RAGBridge] Remote coverage fetch failed, falling back to local coverage:', error);
    }
  }

  return localGetRagCoverageStats();
}

export async function getRagJobState() {
  if (hasRemoteRagService()) {
    try {
      const response = await fetch(ragUrl('/api/admin/rag/status'), {
        cache: 'no-store',
        headers: adminHeaders(),
      });
      if (!response.ok) {
        throw new Error(`RAG status failed with status ${response.status}`);
      }
      const result = await response.json();
      return result.status;
    } catch (error) {
      console.error('[RAGBridge] Remote job state fetch failed, falling back to local state:', error);
    }
  }

  return localGetRagJobState();
}

export async function startRagBackfill(limit = 25): Promise<any> {
  if (hasRemoteRagService()) {
    const response = await fetch(ragUrl('/api/admin/rag/backfill'), {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ limit }),
    });
    if (!response.ok) {
      throw new Error(`RAG backfill failed with status ${response.status}`);
    }
    const result = await response.json();
    return result;
  }

  localResetRagJobState();
  const result = await localBackfillMissingArticleChunks(limit);
  return {
    success: true,
    running: false,
    coverage: await localGetRagCoverageStats(),
    status: localGetRagJobState(),
    message: `Indexed ${result.indexedCount} article chunks locally.`,
  };
}
