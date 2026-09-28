import { Request, Response } from 'express';
import {
  indexArticleIfPossible,
  buildRagAnswer,
  retrieveArticlesForQuery,
  type RagChatHistoryMessage,
  type RagArticleLike,
} from '../services/ragService';

import { runIngestionPipeline } from './ingestionController';
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
    const searchKeyword = answer.searchKeyword || query.slice(0, 40);

    // If Gemini specifies that we need ingestion or there are 0 database sources
    if (needsIngestion && searchKeyword) {
      console.log(`[RAG] Inline ingestion triggered for keyword: "${searchKeyword}"`);
      markIngestionStarted('search', searchKeyword);
      
      try {
        const ingestRes = await runIngestionPipeline(undefined, undefined, searchKeyword, 'search');
        
        markIngestionComplete('search', {
          ingestedCount: ingestRes.ingestedCount,
          skippedCount: ingestRes.skippedCount,
          errorsCount: ingestRes.errorsCount,
        });

        if (ingestRes.ingestedCount > 0) {
          console.log(`[RAG] Ingestion successful. Re-querying vector index for: "${query}"`);
          sources = await retrieveArticlesForQuery(query, { limit, category });
          answer = await buildRagAnswer(query, sanitizedHistory, sources);
        } else {
          console.log(`[RAG] Ingestion found no matching news articles for: "${searchKeyword}"`);
          answer.answer = `I searched Google News for "${searchKeyword}" but couldn't find any recent articles or updates. Consequently, I don't have enough verified information in my database to answer your question about "${query}".`;
        }
      } catch (ingestError: any) {
        console.error(`[RAG] Inline ingestion failed:`, ingestError);
        markIngestionError('search', ingestError.message || String(ingestError));
        answer.answer = `I attempted to search Google News and update my database for your query, but encountered an error. Please try again in a moment.`;
      }
    }

    if (!answer.answer || answer.answer.trim() === '') {
      answer.answer = `I couldn't find any matching coverage in Daily News Insights for "${query}", and no live news updates were found on Google News.`;
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
