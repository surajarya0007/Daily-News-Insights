import { Request, Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { sanitizeArticleImage } from '../utils/imageUtils';
import { DISPLAY_LIMIT } from '../config/constants';
import { invalidateNewsCacheByPrefixes } from '../utils/cacheInvalidation';
import { retrieveArticlesForQuery } from '../services/ragBridge';

const CACHE_TTL = 3600;

const LIST_SELECT = {
  id: true,
  keyword: true,
  headline: true,
  summary: true,
  imageUrl: true,
  imageUrls: true,
  categories: true,
  sentiment: true,
  enrichmentStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/news — list endpoint.
 */
export async function getRecentNews(req: Request, res: Response) {
  const category = req.query.category as string;
  const search = req.query.search as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const cacheKeyBase = search
    ? `homepage:news:search:${search.toLowerCase()}`
    : category && category !== 'Home' && category !== 'undefined'
      ? `homepage:news:${category}`
      : 'homepage:news:all';
  const cacheKey = `${cacheKeyBase}:p${page}:l${limit}`;

  try {
    let articles: any[] | null = null;
    let totalCount = 0;
    let source: 'cache' | 'database' = 'database';

    if (redis) {
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          console.log(`[NewsController] Cache hit for "${cacheKey}". Returning cached data.`);
          const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          
          let candidateArticles = [];
          if (Array.isArray(parsedData)) {
            candidateArticles = parsedData.map((a) => sanitizeArticleImage(a));
            totalCount = candidateArticles.length; // old cache format fallback
          } else if (parsedData && Array.isArray(parsedData.articles)) {
            candidateArticles = parsedData.articles.map((a: any) => sanitizeArticleImage(a));
            totalCount = parsedData.totalCount || 0;
          }
          
          if (Array.isArray(candidateArticles) && candidateArticles.some((a) => a.enrichmentStatus === 'pending')) {
            console.log(`[NewsController] Cache hit for "${cacheKey}" contains pending articles. Bypassing cache to get fresh status.`);
            articles = null;
          } else if (candidateArticles.length > 0) {
            articles = candidateArticles;
            source = 'cache';
          }
        }
      } catch (redisError) {
        console.error('[NewsController] Redis read error (bypassing cache):', redisError);
      }
    }

    if (!articles) {
      console.log(`[NewsController] Cache miss for "${cacheKey}". Querying database...`);
      if (search) {
        const ragResults = await retrieveArticlesForQuery(search, {
          limit,
          category: category && category !== 'Home' && category !== 'undefined' ? category : undefined,
        });

        if (ragResults.length > 0) {
          const articleIds = ragResults.map((result) => result.articleId);
          const fetchedArticles = await prisma.article.findMany({
            where: { id: { in: articleIds } },
            select: LIST_SELECT,
          });

          const articleMap = new Map(fetchedArticles.map((article) => [article.id, sanitizeArticleImage(article)]));
          articles = ragResults
            .map((result) => articleMap.get(result.articleId))
            .filter((article): article is NonNullable<typeof article> => Boolean(article));
          totalCount = ragResults.length;
          source = 'database';
        } else {
          articles = [];
          totalCount = 0;
        }
      } else {
        let whereClause = {};
        if (category && category !== 'Home' && category !== 'undefined') {
          whereClause = {
            categories: {
              has: category,
            },
          };
        }

        const [fetchedArticles, count] = await Promise.all([
          prisma.article.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: LIST_SELECT,
          }),
          prisma.article.count({ where: whereClause })
        ]);

        articles = fetchedArticles.map((a) => sanitizeArticleImage(a));
        totalCount = count;
      }

      if (redis && articles.length > 0) {
        try {
          await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({ articles, totalCount }));
          console.log(`[NewsController] Cached ${articles.length} articles in Redis for key "${cacheKey}".`);
        } catch (redisError) {
          console.error('[NewsController] Redis write error:', redisError);
        }
      }
    }

    if (!articles || articles.length === 0) {
      return res.status(200).json({
        success: true,
        source,
        data: [],
        totalCount,
        totalPages: 0,
        currentPage: page,
      });
    }

    // Always merge real-time 24-hour view counts
    const articleIds = articles.map((a) => a.id);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const viewCounts = await prisma.articleView.groupBy({
      by: ['articleId'],
      where: {
        articleId: { in: articleIds },
        viewedAt: { gte: twentyFourHoursAgo },
      },
      _count: {
        id: true,
      },
    });

    const viewCountMap = new Map<string, number>();
    viewCounts.forEach((vc) => {
      viewCountMap.set(vc.articleId, vc._count.id);
    });

    const dataWithViews = articles.map((a) => ({
      ...a,
      viewCount24h: viewCountMap.get(a.id) || 0,
    }));

    return res.status(200).json({
      success: true,
      source,
      data: dataWithViews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error: any) {
    console.error('[NewsController] Critical error retrieving news:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve news articles.',
      error: error.message || error,
    });
  }
}

/**
 * GET /api/news/sitemap — compact index for crawler-facing sitemap generation.
 */
export async function getSitemapArticles(_req: Request, res: Response) {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        headline: true,
        createdAt: true,
        updatedAt: true,
        categories: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: articles,
    });
  } catch (error: any) {
    console.error('[NewsController] Error retrieving sitemap articles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sitemap articles.',
      error: error.message || error,
    });
  }
}

/**
 * GET /api/news/:id — full article details.
 */
export async function getArticleById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.status(200).json({ success: true, data: sanitizeArticleImage(article) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/news/resolve/:category/:slug — resolve an article by category and headline slug.
 */
export async function getArticleBySlug(req: Request, res: Response) {
  const { category, slug } = req.params;
  try {
    const articles = await prisma.article.findMany({
      where: {
        categories: {
          has: category,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, headline: true, updatedAt: true },
    });

    const slugifyHeadline = (headline: string) => {
      return headline
        .toLowerCase()
        .replace(/['’"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90) || 'article';
    };

    const match = articles.find((a) => slugifyHeadline(a.headline) === slug);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    const article = await prisma.article.findUnique({ where: { id: match.id } });
    if (!article) {
       return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.status(200).json({ success: true, data: sanitizeArticleImage(article) });
  } catch (error: any) {
    console.error('[NewsController] Error resolving article by slug:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/news/:id/image — update the active cover image.
 */
export async function updateArticleImage(req: Request, res: Response) {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ success: false, message: 'imageUrl is required.' });
  }

  try {
    const article = await prisma.article.update({
      where: { id },
      data: { imageUrl }
    });

    try {
      await invalidateNewsCacheByPrefixes([
        'homepage:news:all',
        ...article.categories.map((c) => `homepage:news:${c}`),
      ]);
      console.log(`[NewsController] Invalidated Redis cache for article "${id}" update.`);
    } catch (redisError) {
      console.error('[NewsController] Redis deletion error:', redisError);
    }

    return res.status(200).json({ success: true, data: sanitizeArticleImage(article) });
  } catch (error: any) {
    console.error('[NewsController] Error updating article image:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/news/:id/view — record a page view for an article.
 */
export async function recordArticleView(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    await prisma.articleView.create({
      data: {
        articleId: id,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[NewsController] Error recording article view:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
