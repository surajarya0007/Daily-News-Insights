import { GoogleGenerativeAI } from '@google/generative-ai';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { GEMINI_MODEL_CHAIN } from '../config/constants';
import { articleUrl } from '../utils/seo';

const CHAT_MODEL = GEMINI_MODEL_CHAIN[0];
const EMBEDDING_MODEL = 'gemini-embedding-001';
const RAG_SEARCH_THRESHOLD = 0.55;
const EMBEDDING_DIMENSIONS = 768;
const USE_REMOTE_EMBEDDING = true; // Set to false to run offline local hashing if out of daily Gemini quota

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'their', 'them', 'there', 'these', 'they', 'this', 'to', 'was', 'were',
  'will', 'with', 'after', 'before', 'about', 'into', 'over', 'under', 'while',
  'what', 'when', 'where', 'who', 'why', 'how', 'latest', 'new', 'news',
]);

type ChunkType = 'headline' | 'summary' | 'paragraph';

export interface RagArticleLike {
  id: string;
  keyword: string;
  headline: string;
  summary: string[];
  contentBlocks: string[];
  sectionHeadings?: string[];
  categories: string[];
  sentiment: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ArticleChunkDraft {
  type: ChunkType;
  position: number;
  content: string;
}

export interface RagSearchResult {
  articleId: string;
  headline: string;
  keyword: string;
  categories: string[];
  sentiment: string;
  createdAt: string;
  updatedAt: string;
  articleUrl: string;
  chunkType: ChunkType;
  chunkPosition: number;
  chunkContent: string;
  similarity: number;
}

export interface RagChatSource extends RagSearchResult {
  snippet: string;
}

export interface RagChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

const getApiKeys = (): string[] => {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k && k !== 'your_gemini_or_openai_key' && !k.startsWith('your_'));
};

function hasGeminiApiKey(): boolean {
  return getApiKeys().length > 0;
}

function getChatModel(apiKey?: string) {
  const key = apiKey || getApiKeys()[0];
  if (!key) {
    throw new Error('Gemini API key is not configured.');
  }

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: CHAT_MODEL });
}

function getEmbeddingModel(apiKey?: string) {
  const key = apiKey || getApiKeys()[0];
  if (!key) {
    throw new Error('Gemini API key is not configured.');
  }

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function textToVector(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  for (const token of tokens) {
    const index = hashToken(token) % EMBEDDING_DIMENSIONS;
    vector[index] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm > 0) {
    return vector.map((value) => value / norm);
  }

  return vector;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripChunkPrefix(content: string): string {
  return content
    .replace(/^Article:\s*.*?\|\s*/i, '')
    .replace(/^Summary\s*\d+:\s*/i, '')
    .replace(/^Paragraph\s*\d+:\s*/i, '')
    .replace(/^Section:\s*.*?\|\s*/i, '')
    .trim();
}

function vectorLiteral(values: number[]): string {
  return `[${values.map((value) => Number.isFinite(value) ? value : 0).join(',')}]`;
}

export function buildArticleChunks(article: RagArticleLike): ArticleChunkDraft[] {
  const primaryCategory = article.categories?.[0] || 'News';
  const headline = normalizeText(article.headline);
  const keyword = normalizeText(article.keyword || headline);
  const chunks: ArticleChunkDraft[] = [];

  chunks.push({
    type: 'headline',
    position: 0,
    content: `Article: ${headline} | Category: ${article.categories.join(', ')} | Keyword: ${keyword} | Headline: ${headline}`,
  });

  (article.summary || []).filter(Boolean).forEach((summary, index) => {
    chunks.push({
      type: 'summary',
      position: index,
      content: `Article: ${headline} | Summary ${index + 1}: ${normalizeText(summary)}`,
    });
  });

  (article.contentBlocks || []).filter(Boolean).forEach((paragraph, index) => {
    const sectionHeadingIndex = Math.floor(index / 2);
    const sectionHeading = article.sectionHeadings?.[sectionHeadingIndex];
    const prefix = sectionHeading
      ? `Article: ${headline} | Category: ${primaryCategory} | Section: ${normalizeText(sectionHeading)} | Paragraph ${index + 1}:`
      : `Article: ${headline} | Category: ${primaryCategory} | Paragraph ${index + 1}:`;

    chunks.push({
      type: 'paragraph',
      position: index,
      content: `${prefix} ${normalizeText(paragraph)}`,
    });
  });

  return chunks;
}

let isUsingLocalFallback = !USE_REMOTE_EMBEDDING;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  console.log(`[RAG] Generating embeddings for ${texts.length} texts (Remote mode: ${USE_REMOTE_EMBEDDING})...`);
  if (USE_REMOTE_EMBEDDING) {
    const keys = getApiKeys();
    let currentKeyIndex = 0;
    let attempts = 0;
    const maxAttempts = Math.max(keys.length * 2, 4);
    let delay = 2000;

    while (attempts < maxAttempts && currentKeyIndex < keys.length) {
      try {
        const key = keys[currentKeyIndex];
        if (key) {
          const model = getEmbeddingModel(key);
          const result = await model.batchEmbedContents({
            requests: texts.map((text) => ({
              content: { role: 'user', parts: [{ text }] },
              outputDimensionality: EMBEDDING_DIMENSIONS,
            } as any)),
          });

          if (result.embeddings && Array.isArray(result.embeddings)) {
            console.log(`[RAG] Successfully generated ${result.embeddings.length} embeddings via Gemini (Key index: ${currentKeyIndex}).`);
            return result.embeddings.map((emb) => emb.values);
          }
        }
      } catch (error: any) {
        attempts++;
        const isRateLimit = error?.status === 429 || String(error).includes('429') || String(error).includes('Quota exceeded');
        if (isRateLimit) {
          console.warn(`[RAG] Batch embedding key index ${currentKeyIndex} rate limited or quota exhausted. Trying fallback keys...`);
          currentKeyIndex++;
          if (currentKeyIndex < keys.length) {
            continue;
          }
          if (attempts < maxAttempts) {
            console.warn(`[RAG] All keys rate limited/exhausted. Retrying key index 0 in ${delay}ms...`);
            await sleep(delay);
            currentKeyIndex = 0;
            delay *= 2.5; // exponential backoff
            continue;
          }
        }
        isUsingLocalFallback = true;
        console.warn('[RAG] Remote batch embedding failed, falling back to local hashing:', error);
        break;
      }
    }
  } else {
    isUsingLocalFallback = true;
  }

  console.log(`[RAG] Using local hashing fallback to generate ${texts.length} embeddings.`);
  return texts.map((text) => textToVector(text));
}

async function embedQuery(query: string): Promise<number[]> {
  console.log(`[RAG] Embedding query: "${query}" (Remote mode: ${USE_REMOTE_EMBEDDING})...`);
  if (USE_REMOTE_EMBEDDING) {
    const keys = getApiKeys();
    let currentKeyIndex = 0;
    let attempts = 0;
    const maxAttempts = Math.max(keys.length * 2, 4);
    let delay = 1000;

    while (attempts < maxAttempts && currentKeyIndex < keys.length) {
      try {
        const key = keys[currentKeyIndex];
        if (key) {
          const model = getEmbeddingModel(key);
          const result = await model.embedContent({
            content: { role: 'user', parts: [{ text: query }] },
            outputDimensionality: EMBEDDING_DIMENSIONS,
          } as any);

          if (result.embedding && Array.isArray(result.embedding.values)) {
            console.log(`[RAG] Successfully embedded query via Gemini (Key index: ${currentKeyIndex}).`);
            return result.embedding.values;
          }
        }
      } catch (error: any) {
        attempts++;
        const isRateLimit = error?.status === 429 || String(error).includes('429') || String(error).includes('Quota exceeded');
        if (isRateLimit) {
          console.warn(`[RAG] Query embedding key index ${currentKeyIndex} rate limited or quota exhausted. Trying fallback keys...`);
          currentKeyIndex++;
          if (currentKeyIndex < keys.length) {
            continue;
          }
          if (attempts < maxAttempts) {
            console.warn(`[RAG] All keys rate limited/exhausted. Retrying key index 0 in ${delay}ms...`);
            await sleep(delay);
            currentKeyIndex = 0;
            delay *= 2;
            continue;
          }
        }
        isUsingLocalFallback = true;
        console.warn('[RAG] Remote query embedding failed, falling back to local hashing:', error);
        break;
      }
    }
  } else {
    isUsingLocalFallback = true;
  }

  console.log(`[RAG] Using local hashing fallback to embed query.`);
  return textToVector(query);
}

function buildCategoryFilter(category?: string) {
  if (!category) {
    return Prisma.empty;
  }

  return Prisma.sql`AND ${category} = ANY(a.categories)`;
}

function buildChunkInsertValues(articleId: string, chunks: ArticleChunkDraft[], embeddings: number[][]) {
  return chunks.map((chunk, index) => {
    const embedding = vectorLiteral(embeddings[index] || []);
    return Prisma.sql`(${randomUUID()}, ${articleId}, ${chunk.type}, ${chunk.position}, ${chunk.content}, ${embedding}::vector)`;
  });
}

export async function replaceArticleChunks(article: RagArticleLike): Promise<number> {
  const chunks = buildArticleChunks(article);

  if (!chunks.length) {
    return 0;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  const insertValues = buildChunkInsertValues(article.id, chunks, embeddings);

  await prisma.$transaction(async (tx) => {
    await tx.articleChunk.deleteMany({ where: { articleId: article.id } });
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "ArticleChunk" ("id", "articleId", "type", "position", "content", "embedding")
        VALUES ${Prisma.join(insertValues)}
      `
    );
  });

  return chunks.length;
}

export async function replaceArticleChunksById(articleId: string): Promise<number> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      keyword: true,
      headline: true,
      summary: true,
      contentBlocks: true,
      sectionHeadings: true,
      categories: true,
      sentiment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!article) {
    throw new Error('Article not found for vector indexing.');
  }

  return replaceArticleChunks(article);
}

export async function indexArticleIfPossible(article: RagArticleLike): Promise<boolean> {
  try {
    await replaceArticleChunks(article);
    return true;
  } catch (error) {
    console.error('[RAG] Failed to index article chunks:', error);
    return false;
  }
}

export async function backfillMissingArticleChunks(limit = 20): Promise<{
  indexedCount: number;
  skippedCount: number;
  errorsCount: number;
  totalCount: number;
}> {
  const articles = await prisma.article.findMany({
    where: {
      chunks: { none: {} },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      keyword: true,
      headline: true,
      summary: true,
      contentBlocks: true,
      sectionHeadings: true,
      categories: true,
      sentiment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let indexedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  for (const article of articles) {
    try {
      const created = await replaceArticleChunks(article);
      if (created > 0) {
        indexedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorsCount++;
      console.error(`[RAG] Backfill failed for article "${article.id}":`, error);
    }
  }

  return {
    indexedCount,
    skippedCount,
    errorsCount,
    totalCount: articles.length,
  };
}

export async function getRagCoverageStats(): Promise<{
  totalArticles: number;
  indexedArticles: number;
  missingArticles: number;
  totalChunks: number;
  chunksByType: Record<string, number>;
  coveragePercent: number;
  lastIndexedAt: string | null;
}> {
  const [totalArticles, indexedArticles, totalChunks, chunkTypeGroups, latestChunk] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { chunks: { some: {} } } }),
    prisma.articleChunk.count(),
    prisma.articleChunk.groupBy({
      by: ['type'],
      _count: { id: true },
    }),
    prisma.articleChunk.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const chunksByType: Record<string, number> = {};
  chunkTypeGroups.forEach((group: { type: string; _count: { id: number } }) => {
    chunksByType[group.type] = group._count.id;
  });

  const missingArticles = Math.max(totalArticles - indexedArticles, 0);
  const coveragePercent = totalArticles === 0 ? 0 : Math.round((indexedArticles / totalArticles) * 100);

  return {
    totalArticles,
    indexedArticles,
    missingArticles,
    totalChunks,
    chunksByType,
    coveragePercent,
    lastIndexedAt: latestChunk?.createdAt?.toISOString() || null,
  };
}

export async function searchSemanticArticles(
  query: string,
  options?: {
    limit?: number;
    category?: string;
    threshold?: number;
  }
): Promise<RagSearchResult[]> {
  const limit = options?.limit ?? 8;
  const threshold = options?.threshold ?? (isUsingLocalFallback ? 0.45 : RAG_SEARCH_THRESHOLD);
  const category = options?.category?.trim();
  const normalizedQuery = normalizeText(query);

  console.log(`[RAG] Running semantic search for query: "${query}" (threshold: ${threshold}, limit: ${limit}, category: ${category || 'any'})`);

  if (!normalizedQuery) {
    return [];
  }

  try {
    const queryEmbedding = await embedQuery(normalizedQuery);
    const vector = vectorLiteral(queryEmbedding);
    const categoryFilter = buildCategoryFilter(category);

    const rows = await prisma.$queryRaw<Array<{
      articleId: string;
      keyword: string;
      headline: string;
      categories: string[];
      sentiment: string;
      createdAt: Date;
      updatedAt: Date;
      chunkType: ChunkType;
      chunkPosition: number;
      chunkContent: string;
      similarity: number;
    }>>(Prisma.sql`
      WITH scored AS (
        SELECT
          ac."articleId" AS "articleId",
          a.keyword AS keyword,
          a.headline AS headline,
          a.categories AS categories,
          a.sentiment AS sentiment,
          a."createdAt" AS "createdAt",
          a."updatedAt" AS "updatedAt",
          ac.type AS "chunkType",
          ac.position AS "chunkPosition",
          ac.content AS "chunkContent",
          1 - (ac.embedding <=> ${vector}::vector) AS similarity,
          ROW_NUMBER() OVER (
            PARTITION BY ac."articleId"
            ORDER BY ac.embedding <=> ${vector}::vector ASC, ac.position ASC
          ) AS rn
        FROM "ArticleChunk" ac
        JOIN "Article" a ON a.id = ac."articleId"
        WHERE 1 = 1
        ${categoryFilter}
      )
      SELECT *
      FROM scored
      WHERE rn = 1 AND similarity >= ${threshold}
      ORDER BY similarity DESC, "createdAt" DESC
      LIMIT ${limit}
    `);

    console.log(`[RAG] Semantic search returned ${rows.length} results.`);
    return rows.map((row) => ({
      articleId: row.articleId,
      headline: row.headline,
      keyword: row.keyword,
      categories: row.categories || [],
      sentiment: row.sentiment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      articleUrl: articleUrl(row.categories?.[0] || 'news', row.headline),
      chunkType: row.chunkType,
      chunkPosition: row.chunkPosition,
      chunkContent: row.chunkContent,
      similarity: Number(row.similarity),
    }));
  } catch (error) {
    console.error('[RAG] Semantic search failed:', error);
    return [];
  }
}

export async function keywordSearchArticles(
  query: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<RagSearchResult[]> {
  try {
    const normalizedQuery = normalizeText(query);
    const limit = options?.limit ?? 8;
    const category = options?.category?.trim();

    if (!normalizedQuery) {
      return [];
    }

    const whereClause: Prisma.ArticleWhereInput = {
      OR: [
        { keyword: { contains: normalizedQuery, mode: 'insensitive' } },
        { headline: { contains: normalizedQuery, mode: 'insensitive' } },
        { categories: { has: normalizedQuery } },
      ],
    };

    if (category) {
      whereClause.AND = [{ categories: { has: category } }];
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        keyword: true,
        headline: true,
        categories: true,
        sentiment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return articles.map((article, index) => ({
      articleId: article.id,
      headline: article.headline,
      keyword: article.keyword,
      categories: article.categories || [],
      sentiment: article.sentiment,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      articleUrl: articleUrl(article.categories?.[0] || 'news', article.headline),
      chunkType: index === 0 ? 'headline' : 'summary',
      chunkPosition: 0,
      chunkContent: article.headline,
      similarity: Math.max(0.45, 0.9 - index * 0.05),
    }));
  } catch (error) {
    console.error('[RAG] Keyword fallback search failed:', error);
    return [];
  }
}

export async function retrieveArticlesForQuery(
  query: string,
  options?: {
    limit?: number;
    category?: string;
  }
): Promise<RagSearchResult[]> {
  const semanticResults = await searchSemanticArticles(query, options);
  if (semanticResults.length > 0) {
    return semanticResults;
  }

  return keywordSearchArticles(query, options);
}

export async function buildRagAnswer(
  query: string,
  history: RagChatHistoryMessage[],
  sources: RagSearchResult[]
): Promise<{ answer: string; suggestions: string[]; needsIngestion?: boolean; searchKeyword?: string | null }> {
  const sourceLines = sources.length
    ? sources
        .map(
          (source, index) =>
            `${index + 1}. ${source.headline} (${source.articleUrl})\n${stripChunkPrefix(source.chunkContent).slice(0, 320)}`
        )
        .join('\n\n')
    : 'No strong article matches were found.';

  const historyText = history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

  console.log(`[RAG] Generating answer for query: "${query}" using ${sources.length} sources...`);

  const prompt = `You are the Daily News Insights (DNI) article assistant.
Answer only from the provided Daily News Insights sources.
If the sources do not cover the user question well or do not contain relevant information, set "needsIngestion" to true, and set "searchKeyword" to a concise 2-4 word search term optimized for Google News search to fetch articles about this event (e.g. "Modi Qatar gas explosion").
If the sources DO cover the user question well, set "needsIngestion" to false and "searchKeyword" to null.
Do not browse the web. Do not invent facts.
Provide a detailed, comprehensive, and well-structured answer (2-4 paragraphs if needed) that thoroughly explains the key events, background, context, and outcomes described in the sources.

Conversation:
${historyText || 'No prior conversation.'}

User question:
${query}

Sources:
${sourceLines}

Return ONLY valid JSON with:
{
  "answer": string,
  "suggestions": string[],
  "needsIngestion": boolean,
  "searchKeyword": string | null
}
`;

  if (!hasGeminiApiKey()) {
    return {
      answer: sources.length
        ? `I found ${sources.length} relevant article${sources.length === 1 ? '' : 's'} in Daily News Insights, but the assistant model is not configured.`
        : 'I could not find enough matching coverage in Daily News Insights right now.',
      suggestions: sources.slice(0, 3).map((source) => source.headline),
      needsIngestion: sources.length === 0,
      searchKeyword: query.slice(0, 40),
    };
  }

  try {
    const model = getChatModel();
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    console.log(`[RAG] Successfully generated answer via Gemini: "${(parsed.answer || '').slice(0, 80)}..."`);
    return {
      answer: typeof parsed.answer === 'string' ? parsed.answer : '',
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item: unknown): item is string => typeof item === 'string')
        : [],
      needsIngestion: Boolean(parsed.needsIngestion),
      searchKeyword: typeof parsed.searchKeyword === 'string' ? parsed.searchKeyword : null,
    };
  } catch (error) {
    console.error('[RAG] Answer generation failed:', error);
    return {
      answer: sources.length
        ? `I found matching coverage in Daily News Insights for "${query}", but I could not generate a polished answer just now.`
        : `I could not find enough matching coverage in Daily News Insights for "${query}".`,
      suggestions: sources.slice(0, 3).map((source) => source.headline),
      needsIngestion: sources.length === 0,
      searchKeyword: query.slice(0, 40),
    };
  }
}

export function buildSourceSnippet(content: string): string {
  return stripChunkPrefix(content);
}

export function buildArticleLink(category: string, headline: string): string {
  return articleUrl(category, headline);
}

export function articleMatchesCategory(article: { categories?: string[] }, category?: string): boolean {
  if (!category) return true;
  return !!article.categories?.includes(category);
}

/**
 * Prunes article chunks that are older than a specific number of days.
 * This keeps the database size small and optimized.
 */
export async function pruneOldArticleChunks(days = 7): Promise<number> {
  console.log(`[RAG] Pruning article chunks older than ${days} days...`);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.articleChunk.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`[RAG] Successfully pruned ${result.count} chunks.`);
  return result.count;
}

