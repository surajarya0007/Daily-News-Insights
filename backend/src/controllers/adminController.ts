import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import {
  getRagCoverageStats,
  getRagJobState,
  indexArticleInRag,
  startRagBackfill as startRemoteRagBackfill,
} from '../services/ragBridge';

/**
 * GET /api/admin/stats
 */
export async function getAdminStats(req: Request, res: Response) {
  try {
    const totalArticles = await prisma.article.count();
    const totalViews = await prisma.articleView.count();
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const views24h = await prisma.articleView.count({
      where: {
        viewedAt: { gte: twentyFourHoursAgo }
      }
    });

    // Sentiment breakdown
    const sentimentGroups = await prisma.article.groupBy({
      by: ['sentiment'],
      _count: { id: true }
    });
    const sentimentBreakdown = { Positive: 0, Negative: 0, Neutral: 0 };
    sentimentGroups.forEach(g => {
      if (g.sentiment === 'Positive' || g.sentiment === 'Negative' || g.sentiment === 'Neutral') {
        sentimentBreakdown[g.sentiment] = g._count.id;
      }
    });

    // Category breakdown (since categories is String[] and PostgreSQL stores it as text[], group-by is not direct in Prisma. Aggregate in-memory)
    const allArticleCategories = await prisma.article.findMany({
      select: { categories: true }
    });
    const categoryBreakdown: Record<string, number> = {};
    allArticleCategories.forEach(a => {
      a.categories.forEach(cat => {
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });
    });

    // Top viewed articles (All time)
    const topViews = await prisma.articleView.groupBy({
      by: ['articleId'],
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    const topArticleIds = topViews.map(tv => tv.articleId);
    const topArticlesInfo = await prisma.article.findMany({
      where: { id: { in: topArticleIds } },
      select: {
        id: true,
        headline: true,
        categories: true,
        sentiment: true
      }
    });

    const topArticles = topViews.map(tv => {
      const info = topArticlesInfo.find(art => art.id === tv.articleId);
      return {
        id: tv.articleId,
        headline: info?.headline || 'Unknown Article',
        categories: info?.categories || [],
        sentiment: info?.sentiment || 'Neutral',
        views: tv._count.id
      };
    }).filter(a => a.headline !== 'Unknown Article');

    // Views last 7 days (grouped by day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const viewsPastWeek = await prisma.articleView.findMany({
      where: {
        viewedAt: { gte: sevenDaysAgo }
      },
      select: {
        viewedAt: true
      }
    });

    const viewsByDay: Record<string, number> = {};
    // Pre-populate last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      viewsByDay[dateStr] = 0;
    }

    viewsPastWeek.forEach(v => {
      const dateStr = new Date(v.viewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (viewsByDay[dateStr] !== undefined) {
        viewsByDay[dateStr]++;
      }
    });

    const viewsOverTime = Object.entries(viewsByDay)
      .map(([date, count]) => ({ date, count }))
      .reverse(); // chronological

    const ragCoverage = await getRagCoverageStats();

    return res.status(200).json({
      success: true,
      stats: {
        totalArticles,
        totalViews,
        views24h,
        sentimentBreakdown,
        categoryBreakdown,
        topArticles,
        viewsOverTime,
        ragCoverage,
      }
    });
  } catch (error: any) {
    console.error('[AdminStatsController] Error fetching admin stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve system statistics.' });
  }
}

/**
 * POST /api/admin/news
 */
export async function createArticle(req: Request, res: Response) {
  const {
    headline,
    keyword,
    summary,
    contentBlocks,
    sectionHeadings,
    highlightedFacts,
    sentiment,
    categories,
    imageUrl
  } = req.body;

  if (!headline || !keyword || !summary || !contentBlocks || !sentiment || !categories || categories.length === 0) {
    return res.status(400).json({ success: false, message: 'Required fields are missing.' });
  }

  try {
    const article = await prisma.article.create({
      data: {
        headline,
        keyword,
        summary: Array.isArray(summary) ? summary : [summary],
        contentBlocks: Array.isArray(contentBlocks) ? contentBlocks : [contentBlocks],
        sectionHeadings: Array.isArray(sectionHeadings) ? sectionHeadings : [],
        highlightedFacts: Array.isArray(highlightedFacts) ? highlightedFacts : [],
        sentiment,
        categories,
        imageUrl: imageUrl || null,
        imageUrls: imageUrl ? [imageUrl] : [],
        enrichmentStatus: 'complete'
      }
    });

    await indexArticleInRag(article);

    // Invalidate Redis caches
    await invalidateNewsCaches(categories);

    return res.status(201).json({ success: true, data: article });
  } catch (error: any) {
    console.error('[AdminController] Create article error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create article manually.' });
  }
}

/**
 * PUT /api/admin/news/:id
 */
export async function updateArticle(req: Request, res: Response) {
  const { id } = req.params;
  const {
    headline,
    keyword,
    summary,
    contentBlocks,
    sectionHeadings,
    highlightedFacts,
    sentiment,
    categories,
    imageUrl
  } = req.body;

  try {
    // Find existing to clear cache properly
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    const updated = await prisma.article.update({
      where: { id },
      data: {
        headline: headline ?? existing.headline,
        keyword: keyword ?? existing.keyword,
        summary: summary ?? existing.summary,
        contentBlocks: contentBlocks ?? existing.contentBlocks,
        sectionHeadings: sectionHeadings ?? existing.sectionHeadings,
        highlightedFacts: highlightedFacts ?? existing.highlightedFacts,
        sentiment: sentiment ?? existing.sentiment,
        categories: categories ?? existing.categories,
        imageUrl: imageUrl === undefined ? existing.imageUrl : imageUrl || null,
        imageUrls: imageUrl ? [imageUrl] : existing.imageUrls
      }
    });

    await indexArticleInRag(updated);

    // Invalidate Redis caches
    const allCategories = Array.from(new Set([...existing.categories, ...updated.categories]));
    await invalidateNewsCaches(allCategories);

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[AdminController] Update article error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update article.' });
  }
}

/**
 * DELETE /api/admin/news/:id
 */
export async function deleteArticle(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    await prisma.article.delete({ where: { id } });

    // Invalidate caches
    await invalidateNewsCaches(existing.categories);

    return res.status(200).json({ success: true, message: 'Article deleted successfully.' });
  } catch (error: any) {
    console.error('[AdminController] Delete article error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete article.' });
  }
}

/**
 * POST /api/admin/clear-cache
 */
export async function clearCache(req: Request, res: Response) {
  if (!redis) {
    return res.status(200).json({ success: true, message: 'Redis is not enabled. Caches are in-memory.' });
  }

  try {
    await redis.flushall();
    console.log('[AdminController] Flushed Redis Cache entirely.');
    return res.status(200).json({ success: true, message: 'Redis cache flushed completely.' });
  } catch (error: any) {
    console.error('[AdminController] Flush cache error:', error);
    return res.status(500).json({ success: false, message: 'Failed to flush Redis cache.' });
  }
}

/**
 * GET /api/admin/rag/status
 */
export async function getRagStatus(_req: Request, res: Response) {
  try {
    const [coverage, state] = await Promise.all([getRagCoverageStats(), getRagJobState()]);

    return res.status(200).json({
      success: true,
      coverage,
      status: state,
      running: state.status === 'processing',
    });
  } catch (error: any) {
    console.error('[AdminController] RAG status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve vector index status.' });
  }
}

/**
 * POST /api/admin/rag/backfill
 */
export async function startRagBackfill(req: Request, res: Response) {
  const limit = Number(req.body?.limit || 25);

  try {
    const result = await startRemoteRagBackfill(limit);
    return res.status(result.running ? 202 : 200).json(result);
  } catch (error: any) {
    console.error('[AdminController] RAG backfill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start vector backfill.' });
  }
}

/**
 * Helper to delete Redis cache keys
 */
async function invalidateNewsCaches(categories: string[]) {
  if (!redis) return;
  try {
    const keys = ['homepage:news:all', ...categories.map(c => `homepage:news:${c}`)];
    console.log(`[AdminController] Invalidating Redis keys: ${keys.join(', ')}`);
    await redis.del(...keys);
  } catch (err) {
    console.error('[AdminController] Redis invalidation error:', err);
  }
}
