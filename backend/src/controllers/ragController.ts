import { Request, Response } from 'express';
import {
  indexArticleIfPossible,
  buildRagAnswer,
  retrieveArticlesForQuery,
  synthesizeLiveWebAnswer,
  type RagChatHistoryMessage,
  type RagArticleLike,
} from '../services/ragService';

import { runIngestionPipeline, fetchArticlesForKeyword } from './ingestionController';
import {
  markIngestionStarted,
  markIngestionComplete,
  markIngestionError,
} from '../services/ingestionStatus';

function parseLimit(value: unknown, fallback = 8): number {
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(limit), 20);
}

/**
 * GET /api/rag/search
 */
export async function searchRagArticles(req: Request, res: Response) {
  const query = String(req.query.q || req.query.query || '').trim();
  const category = String(req.query.category || '').trim() || undefined;
  const limit = parseLimit(req.query.limit, 8);

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required.' });
  }

  try {
    const results = await retrieveArticlesForQuery(query, { limit, category });
    return res.status(200).json({
      success: true,
      query,
      results,
    });
  } catch (error: any) {
    console.error('[RAGController] Search error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search Daily News Insights content.' });
  }
}

/**
 * POST /api/rag/chat
 */
export async function chatWithArticles(req: Request, res: Response) {
  const query = String(req.body?.query || '').trim();
  const category = String(req.body?.category || '').trim() || undefined;
  const limit = parseLimit(req.body?.limit, 6);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required.' });
  }

  const sanitizedHistory: RagChatHistoryMessage[] = history
    .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-8)
    .map((item: any) => ({
      role: item.role,
      content: item.content,
    }));

  try {
    let sources = await retrieveArticlesForQuery(query, { limit, category });
    let answer = await buildRagAnswer(query, sanitizedHistory, sources);

    const needsIngestion = answer.needsIngestion || sources.length === 0;
    const searchKeyword = (answer.searchKeyword || query).slice(0, 50).trim();

    // If Gemini specifies that we need ingestion or there are 0 database sources
    if (needsIngestion && searchKeyword) {
      console.log(`[RAG] Real-time live news fetch for: "${searchKeyword}"`);

      // 1. Fetch live RSS snippets instantly (< 500ms)
      const liveItems = await fetchArticlesForKeyword(searchKeyword);

      if (liveItems && liveItems.length > 0) {
        // 2. Synthesize an immediate grounded answer from the live RSS items (< 1.5s)
        const liveResult = await synthesizeLiveWebAnswer(query, sanitizedHistory, liveItems);

        if (liveResult.answer && liveResult.answer.trim()) {
          answer.answer = liveResult.answer;
          answer.suggestions = liveResult.suggestions;
        }

        // Map live RSS items into source cards for the frontend
        sources = liveItems.slice(0, 4).map((item, idx) => ({
          articleId: `live-${idx}`,
          headline: item.title,
          keyword: searchKeyword,
          categories: [category || 'World'],
          sentiment: 'Neutral',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          articleUrl: item.url,
          chunkType: 'headline' as const,
          chunkPosition: 0,
          chunkContent: item.description || item.title,
          similarity: 0.95 - idx * 0.05,
        }));

        // 3. LAZY BACKGROUND INGESTION (Fire-and-forget, non-blocking)
        // Crawls full articles, generates 768-dim embeddings, and stores in Postgres & Redis
        console.log(`[RAG] Scheduling lazy background ingestion for: "${searchKeyword}"`);
        markIngestionStarted('search', searchKeyword);
        void runIngestionPipeline(undefined, undefined, searchKeyword, 'search')
          .then((ingestRes) => {
            console.log(`[RAG] Background ingestion finished for "${searchKeyword}": Ingested ${ingestRes.ingestedCount}, Skipped ${ingestRes.skippedCount}`);
            markIngestionComplete('search', ingestRes);
          })
          .catch((err) => {
            console.error(`[RAG] Background ingestion failed for "${searchKeyword}":`, err);
            markIngestionError('search', err.message || String(err));
          });
      } else {
        console.log(`[RAG] No live articles found on Google News for: "${searchKeyword}"`);
        if (!answer.answer || answer.answer.trim() === '') {
          answer.answer = `I searched our database and live news feeds for "${query}", but couldn't find any recent verified coverage on this topic.`;
        }
      }
    }

    if (!answer.answer || answer.answer.trim() === '') {
      answer.answer = `I couldn't find any matching coverage in Daily News Insights for "${query}", and no live news updates were found.`;
    }

    return res.status(200).json({
      success: true,
      query,
      answer: answer.answer,
      suggestions: answer.suggestions,
      sources,
    });
  } catch (error: any) {
    console.error('[RAGController] Chat error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate a grounded answer.' });
  }
}

/**
 * POST /api/rag/index
 */
export async function indexArticle(req: Request, res: Response) {
  const article = req.body?.article as RagArticleLike | undefined;
  if (!article?.id || !article?.headline) {
    return res.status(400).json({ success: false, message: 'Valid article payload is required.' });
  }

  try {
    const success = await indexArticleIfPossible(article);
    return res.status(200).json({ success });
  } catch (error: any) {
    console.error('[RAGController] Index error:', error);
    return res.status(500).json({ success: false, message: 'Failed to index article chunks.' });
  }
}
