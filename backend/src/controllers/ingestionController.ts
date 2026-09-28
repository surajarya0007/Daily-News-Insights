import { Request, Response } from 'express';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db';
import redis from '../config/redis';
import { scrapeArticle } from '../services/scraperService';
import { getCopyrightFreeImage } from '../services/imageService';
import { indexArticleInRag } from '../services/ragBridge';
import { invalidateNewsCacheByPrefixes } from '../utils/cacheInvalidation';
// Removed local triggerVideoGeneration import as it now runs on a separate microservice
import {
  getIngestionStatus,
  isIngestionRunning,
  markIngestionComplete,
  markIngestionError,
  markIngestionScraping,
  markIngestionStarted,
  type IngestionScope,
} from '../services/ingestionStatus';

const parser = new Parser({
  customFields: {
    item: [['source', 'source', { keepArray: false }]],
  },
});

const CATEGORY_FEEDS: Record<string, string> = {
  'Tech': 'https://news.google.com/news/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
  'Business': 'https://news.google.com/news/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en',
  'Science': 'https://news.google.com/news/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en',
  'Health': 'https://news.google.com/news/rss/headlines/section/topic/HEALTH?hl=en-IN&gl=IN&ceid=IN:en',
  'Entertainment': 'https://news.google.com/news/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en',
  'Sports': 'https://news.google.com/news/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en',
  'World': 'https://news.google.com/news/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en',
  'India': 'https://news.google.com/news/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en',
  'Finance': 'https://news.google.com/rss/search?q=finance&hl=en-IN&gl=IN&ceid=IN:en',
  'Politics': 'https://news.google.com/news/rss/headlines/section/topic/POLITICS?hl=en-IN&gl=IN&ceid=IN:en'
};

const getApiKeys = (): string[] => {
  const raw = process.env.GEMINI_API_KEY || '';
  return raw.split(',').map(k => k.trim()).filter(k => k && k !== 'your_gemini_or_openai_key' && !k.startsWith('your_'));
};

interface SynthesisOutput {
  headline: string;
  summary: string[];
  contentBlocks: string[];
  sectionHeadings: string[];
  highlightedFacts: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  categories: string[];
  imageSearchQuery: string;
  aiImagePrompt: string;
  imageSearchQueryFallbacks: string[];
  imageSearchSubject: string;
}

function isGoogleNewsUrl(url: string): boolean {
  return url.includes('news.google.com');
}

function extractRealUrl(item: any): string | undefined {
  if (item.link && !isGoogleNewsUrl(item.link)) {
    return item.link;
  }
  return undefined;
}

import { GEMINI_MODEL_CHAIN } from '../config/constants';

/**
 * Uses Gemini (with model fallback) to extract 5 trending keywords/topics from a list of headlines.
 */
async function extractTrendingKeywords(category: string, headlines: string[], excludedKeywords: string[] = []): Promise<string[]> {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    console.warn('[Ingestion] No Gemini API keys configured. Skipping trend extraction.');
    return headlines.slice(0, 3);
  }

  const exclusionText = excludedKeywords.length > 0
    ? `\n\nCRITICAL RULE: Do NOT identify or return any stories, topics, or events that are identical or highly similar/semantically overlapping with the following recently covered topics/queries:\n${excludedKeywords.map(k => `- ${k}`).join('\n')}\nFocus on finding other emerging, secondary, or new stories from the headlines.`
    : '';

  const prompt = `You are a trend-discovery engine. Below is a list of recent headlines in the category "${category}". Identify the top 5 distinct trending stories, events, or specific news developments that are dominating the news based on these headlines.
 
CRITICAL INSTRUCTION: Do NOT return broad or generic keywords/categories (e.g. do NOT return "Cybersecurity threats", "AI", "Cricket", "World Cup"). Instead, return highly specific, descriptive, event-driven queries representing the actual news story (e.g. "Google DeepMind cybersecurity insider threat AI roadmap", "NEET exam paper leak supreme court hearing controversy", "India vs Afghanistan T20 World Cup super eight match"). Each query should be descriptive and optimized to search Google News for articles covering that specific event.

Return a JSON array of strings.${exclusionText}
Headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;

  let lastError: any;
  for (let k = 0; k < apiKeys.length; k++) {
    const apiKey = apiKeys[k];
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      for (const modelName of GEMINI_MODEL_CHAIN) {
        try {
          console.log(`[Ingestion] Extracting trends using model: ${modelName} (key index ${k})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'array',
                items: { type: 'string' },
                description: 'Top 5 distinct, descriptive, event-driven queries representing specific news stories dominating the headlines.'
              } as any
            }
          });

          const result = await model.generateContent(prompt);
          return JSON.parse(result.response.text().trim());
        } catch (error: any) {
          lastError = error;
          console.warn(`[Ingestion] Trend extraction failed with model ${modelName} (key index ${k}). Error:`, error.message || error);

          const errMsg = error.message?.toLowerCase() || '';
          const errStatus = error.status;
          const shouldSwitchKey = errStatus === 403 || errStatus === 429 || errMsg.includes('denied') || errMsg.includes('forbidden') || errMsg.includes('quota') || errMsg.includes('limit');
          if (shouldSwitchKey && k < apiKeys.length - 1) {
            console.warn(`[Ingestion] API key issue detected. Swapping to next API key.`);
            throw error; // Propagate to swap key
          }
        }
      }
    } catch (keyErr) {
      if (k < apiKeys.length - 1) {
        console.warn(`[Ingestion] API key index ${k} failed. Swapping to next key...`);
        continue;
      }
    }
  }

  console.error(`[Ingestion] All models in fallback chain failed for trend extraction.`, lastError);
  return headlines.slice(0, 3); // Fallback to raw titles
}

/**
 * Uses Gemini (with model fallback) to synthesize scraped content into a single professional, objective article dossier.
 */
async function synthesizeTrendDossier(topic: string, sources: { headline: string; content: string }[]): Promise<SynthesisOutput> {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('[Ingestion] No Gemini API keys configured.');
  }

  const sourcesText = sources.map((s, i) => `Source ${i + 1}: ${s.headline}\nContent:\n${s.content.slice(0, 2500)}`).join('\n\n---\n\n');

  const prompt = `You are a senior journalist at a premium news publication writing a comprehensive editorial dossier for "Daily News Insights".
Your article must match the depth, structure, and length of high-quality publications like BBC, The Hindu, or Reuters.

Topic: "${topic}"

Write a detailed, professional, multi-section article. Your output MUST follow these strict rules:
1. HEADLINE: Write a highly catchy, engaging, and professional headline. It must be active, punchy, and directly reflect the overall sentiment of the story (e.g., dramatic/urgent for Negative stories, inspiring/breakthrough-focused for Positive stories, and intriguing/authoritative for Neutral stories). Avoid dry, purely descriptive, or passive headlines.
2. SUMMARY: Write exactly 5 distinct, factual bullet points. Each bullet must be a full, complete sentence (minimum 20 words). Cover different angles: what happened, who is involved, what the impact is, what experts/officials say, and what happens next. Do NOT use markdown in summary.
3. CONTENT BLOCKS: Write exactly 8 complete paragraphs in English. Each paragraph must be at least 80 words. The first paragraph is the lead paragraph.
   * Use double-asterisk markdown (e.g. **Google** or **7,000mAh**) to bold ONLY the most critical entities, key figures, or statistics. Cap it to a maximum of 2-3 short key terms per paragraph. Do not over-bold or bold common words, as it looks cluttered.
   * CRITICAL JOURNALISTIC TONE RULE: Avoid typical AI writing patterns and clichés. Do NOT start paragraphs with transitions like "it is worth noting," "furthermore," "in conclusion," or "consequently." Avoid flowery AI filler phrases such as "testament to," "beacon of," "delves into," or "symphony of." The prose must read like natural, authoritative, human-written journalism.
4. SECTION HEADINGS: Write exactly 4 section headings (short, bold editorial titles, 3-6 words each) that will appear before paragraphs 2, 4, 6, and 8 respectively. Do NOT use markdown formatting here.
5. HIGHLIGHTED FACTS: Extract exactly 4 standalone key statistics, quotes, or notable facts that can be displayed as pull-quotes or callout boxes. Each must be a single compelling sentence. Do NOT use markdown.
6. SENTIMENT: Choose the overall tone: Positive, Negative, or Neutral.
7. CATEGORIES: Select exactly 1 primary main category as the first element of the array, and 0-2 optional sub/related categories that are also relevant to the article as subsequent elements.
8. IMAGE SEARCH QUERY: Provide a concise, high-relevance search query (2-4 words) targeting public-domain news photos or stock images for this topic (e.g., "OnePlus phone", "Hyundai Creta", "Narendra Modi"). Focus strictly on the physical core noun/entity. Do NOT include generic location names (like "India", "Sri Lanka") or generic temporal words (like "monsoon", "rains") in the search query unless the location itself is the primary topic of the photo. Keep it simple, using only nouns and simple adjectives without punctuation.
9. AI IMAGE PROMPT: Provide a detailed, descriptive, photorealistic prompt suitable for an AI image generator. It MUST be highly specific to the article's main subject, including the exact brand, model, features, design, and color. For example: "A premium professional product photograph of a OnePlus Nord CE4 Lite smartphone in a vibrant blue color, clean minimalist background, studio lighting, high resolution, 8k". Focus on style, lighting, setting, composition, and professional aesthetics to match the article point.
10. IMAGE SEARCH QUERY FALLBACKS: Provide a list of 2-3 simpler fallback search terms (strings) representing the key people, entities, agencies, or main nouns in the article (e.g., ["AR Rahman", "Asha Bhosle"] or ["Joe Root"]). Do not include generic filler words.
11. IMAGE SEARCH SUBJECT: Provide the absolute core keyword or entity name of the article (e.g., "dengue", "OnePlus", "Pankaj Tripathi", "Narendra Modi"). This is a single specific word or name that MUST be matched in image search results to prevent completely irrelevant image matches (like generic landscapes/streets).

Do NOT use any markdown tags, headings, links, or lists inside the content blocks other than double asterisks (**) for bold text.

Sources:
${sourcesText}`;

  let lastError: any;
  for (let k = 0; k < apiKeys.length; k++) {
    const apiKey = apiKeys[k];
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      for (const modelName of GEMINI_MODEL_CHAIN) {
        try {
          console.log(`[Ingestion] Synthesizing dossier using model: ${modelName} (key index ${k})`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  headline: { type: 'string', description: 'A highly catchy, journalistic headline (under 15 words) tailored to reflect the article\'s overall sentiment (Positive, Negative, or Neutral).' },
                  summary: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exactly 5 distinct bullet points, each a complete sentence of minimum 20 words covering different story angles.'
                  },
                  contentBlocks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exactly 8 full prose paragraphs, each at least 80 words. Use double-asterisks (**) selectively to bold a maximum of 2-3 key entities or figures per paragraph.'
                  },
                  sectionHeadings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exactly 4 editorial section headings (3-6 words each) for paragraphs 2, 4, 6, and 8.'
                  },
                  highlightedFacts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exactly 4 pull-quote worthy facts, statistics, or notable statements as single compelling sentences.'
                  },
                  sentiment: { type: 'string', enum: ['Positive', 'Negative', 'Neutral'] },
                  categories: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 3,
                    items: {
                      type: 'string',
                      enum: ['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Finance', 'Politics', 'World', 'India', 'Sports']
                    }
                  },
                  imageSearchQuery: {
                    type: 'string',
                    description: 'A simple 2-4 word search query focusing strictly on the physical core noun/entity. Do NOT include generic locations (e.g., "India", "Sri Lanka") or generic temporal words (e.g., "monsoon", "rains") unless the location is the actual core subject of the photo.'
                  },
                  aiImagePrompt: {
                    type: 'string',
                    description: 'A highly detailed and specific photorealistic prompt depicting the exact brand, model, device, person, or event featured in the article (e.g. "A premium professional product photograph of a OnePlus Nord CE4 Lite...").'
                  },
                  imageSearchQueryFallbacks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'A list of 2-3 fallback search keywords representing the key persons, agencies, or main nouns in the article (e.g. ["AR Rahman", "Asha Bhosle"]).'
                  },
                  imageSearchSubject: {
                    type: 'string',
                    description: 'The absolute core entity name, brand, person, or disease (e.g., "dengue", "OnePlus", "Pankaj Tripathi") to filter/validate search results.'
                  }
                },
                required: [
                  'headline',
                  'summary',
                  'contentBlocks',
                  'sectionHeadings',
                  'highlightedFacts',
                  'sentiment',
                  'categories',
                  'imageSearchQuery',
                  'aiImagePrompt',
                  'imageSearchQueryFallbacks',
                  'imageSearchSubject'
                ]
              } as any
            }
          });

          const result = await model.generateContent(prompt);
          return JSON.parse(result.response.text().trim());
        } catch (error: any) {
          lastError = error;
          console.warn(`[Ingestion] Synthesis failed with model ${modelName} (key index ${k}). Error:`, error.message || error);

          const errMsg = error.message?.toLowerCase() || '';
          const errStatus = error.status;
          const shouldSwitchKey = errStatus === 403 || errStatus === 429 || errMsg.includes('denied') || errMsg.includes('forbidden') || errMsg.includes('quota') || errMsg.includes('limit');
          if (shouldSwitchKey && k < apiKeys.length - 1) {
            console.warn(`[Ingestion] API key issue detected during synthesis. Swapping to next API key.`);
            throw error; // Swap key
          }
        }
      }
    } catch (keyErr) {
      if (k < apiKeys.length - 1) {
        console.warn(`[Ingestion] API key index ${k} failed during synthesis. Swapping to next key...`);
        continue;
      }
    }
  }

  throw lastError || new Error('All models and keys in fallback chain failed for synthesis.');
}

/**
 * Searches Google News for articles matching a query/keyword.
 */
async function fetchArticlesForKeyword(keyword: string): Promise<{ title: string; url: string; description: string }[]> {
  try {
    const hl = 'en-IN';
    const gl = 'IN';
    const ceid = 'IN:en';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const feed = await parser.parseURL(url);
    if (!feed.items) return [];

    return feed.items.slice(0, 10).map((item) => ({
      title: item.title || 'Untitled',
      url: extractRealUrl(item) || item.link || '',
      description: item.contentSnippet || item.content || ''
    }));
  } catch (error) {
    console.error(`[Ingestion] Error searching Google News for "${keyword}":`, error);
    return [];
  }
}

/**
 * Invalidate Redis Cache
 */
async function invalidateCache(categories: string[], searchQuery?: string) {
  try {
    const keys = ['homepage:news:all', 'homepage:news:search:', ...categories.map(c => `homepage:news:${c}`)];
    if (searchQuery) {
      keys.push(`homepage:news:search:${searchQuery.toLowerCase()}`);
    }
    console.log(`[Ingestion] Invalidating Redis caches: ${keys.join(', ')}`);
    await invalidateNewsCacheByPrefixes(keys);
  } catch (err) {
    console.error('[Ingestion] Redis cache invalidation error:', err);
  }
}

/**
 * Runs parallel crawling of URLs with concurrency.
 */
async function crawlSources(sources: { title: string; url: string; description: string }[]): Promise<{ headline: string; content: string }[]> {
  const results: { headline: string; content: string }[] = [];
  const concurrency = 5;
  let index = 0;

  async function worker() {
    while (index < sources.length) {
      const currentIdx = index++;
      const source = sources[currentIdx];
      if (!source.url) {
        results.push({ headline: source.title, content: source.description });
        continue;
      }

      try {
        console.log(`[Ingestion] Scraping: ${source.url}`);
        const scrapeResult = await scrapeArticle(source.url, source.title);
        results.push({
          headline: source.title,
          content: scrapeResult.markdown || source.description
        });
      } catch (err) {
        console.warn(`[Ingestion] Scrape failed for ${source.url}, falling back to description:`, err);
        results.push({ headline: source.title, content: source.description });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, sources.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Helper to notify the social media microservice to start posting pipeline
 */
async function triggerSocialPostingPipeline(articleId: string, prompt: string) {
  const socialUrl = process.env.SOCIAL_SERVICE_URL || 'http://localhost:8090';
  const url = `${socialUrl}/api/social/start`;
  try {
    console.log(`[Ingestion] Triggering social microservice at: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ articleId, prompt })
    });
    if (!response.ok) {
      console.error(`[Ingestion] Social microservice returned error status: ${response.status}`);
    } else {
      console.log(`[Ingestion] Social microservice pipeline triggered successfully.`);
    }
  } catch (err) {
    console.error('[Ingestion] Failed to contact social microservice:', err);
  }
}

/**
 * Ingestion runner
 */
export async function runIngestionPipeline(
  category?: string,
  country?: string,
  search?: string,
  scope: IngestionScope = search && search.trim() ? 'search' : 'general'
): Promise<{ ingestedCount: number; skippedCount: number; errorsCount: number }> {
  let ingestedCount = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  // Case 1: Search-based Ingestion (On demand search query)
  if (search && search.trim()) {
    const keyword = search.trim();
    console.log(`[Ingestion] Starting search-based ingestion for: "${keyword}"`);

    // Check deduplication (last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const existing = await prisma.article.findFirst({
      where: {
        keyword: { equals: keyword, mode: 'insensitive' },
        createdAt: { gte: fourHoursAgo }
      }
    });

    if (existing) {
      console.log(`[Ingestion] Keyword "${keyword}" already ingested in the last 4 hours. Skipping.`);
      return { ingestedCount: 0, skippedCount: 1, errorsCount: 0 };
    }

    const items = await fetchArticlesForKeyword(keyword);
    if (items.length === 0) {
      console.warn(`[Ingestion] No sources found for "${keyword}"`);
      return { ingestedCount: 0, skippedCount: 0, errorsCount: 1 };
    }

    try {
      markIngestionScraping(scope);
      const crawled = await crawlSources(items);
      const synthesis = await synthesizeTrendDossier(keyword, crawled);

      // Extract domains of sources to cite
      const sourceDomains = Array.from(
        new Set(
          items
            .map((item) => {
              try {
                const urlObj = new URL(item.url);
                return urlObj.hostname.replace('www.', '');
              } catch {
                return '';
              }
            })
            .filter((domain) => domain && !domain.includes('google.com'))
        )
      ).slice(0, 4);

      const finalContentBlocks = [...synthesis.contentBlocks];
      if (sourceDomains.length > 0) {
        finalContentBlocks.push(`Sources Cited: ${sourceDomains.join(', ')}`);
      }
      
      const createdArticle = await prisma.article.create({
        data: {
          keyword,
          headline: synthesis.headline,
          summary: synthesis.summary,
          contentBlocks: finalContentBlocks,
          sectionHeadings: synthesis.sectionHeadings || [],
          highlightedFacts: synthesis.highlightedFacts || [],
          sentiment: synthesis.sentiment,
          categories: synthesis.categories,
          imageUrl: null,
          imageUrls: [],
          enrichmentStatus: 'pending'
        }
      });

      ingestedCount++;      
      await indexArticleInRag(createdArticle);
      await invalidateCache(synthesis.categories, keyword);
      
      // Trigger the Social Posting microservice (fire and forget)
      void triggerSocialPostingPipeline(createdArticle.id, synthesis.aiImagePrompt);

      void getCopyrightFreeImage(
        synthesis.imageSearchQuery,
        synthesis.categories[0] || 'News',
        synthesis.aiImagePrompt,
        synthesis.imageSearchQueryFallbacks,
        synthesis.headline,
        synthesis.imageSearchSubject
      ).then(async (imageResult) => {
        try {
          await prisma.article.update({
            where: { id: createdArticle.id },
            data: {
              imageUrl: imageResult.imageUrl,
              imageUrls: imageResult.imageUrls,
              enrichmentStatus: 'complete'
            }
          });
          console.log(`[Ingestion] Background image search complete for "${keyword}". Article "${createdArticle.id}" updated.`);
          await invalidateCache(synthesis.categories, keyword);
        } catch (updateErr) {
          console.error(`[Ingestion] Background image update failed for article "${createdArticle.id}":`, updateErr);
        }
      }).catch(async (imageErr) => {
        console.error(`[Ingestion] Background image search failed for keyword "${keyword}":`, imageErr);
        try {
          await prisma.article.update({
            where: { id: createdArticle.id },
            data: {
              enrichmentStatus: 'complete'
            }
          });
          await invalidateCache(synthesis.categories, keyword);
        } catch (dbErr) {
          console.error(`[Ingestion] Failed to mark failed image search article as complete:`, dbErr);
        }
      });
    } catch (err) {
      console.error(`[Ingestion] Synthesis/save failed for search topic "${keyword}":`, err);
      errorsCount++;
    }

    return { ingestedCount, skippedCount, errorsCount };
  }

  // Case 2: General Trending Topics Ingestion
  let categoriesToIngest = Object.keys(CATEGORY_FEEDS);
  if (category) {
    const matchedKey = Object.keys(CATEGORY_FEEDS).find(k => k.toLowerCase() === category.toLowerCase());
    categoriesToIngest = matchedKey ? [matchedKey] : [];
  }
  console.log(`[Ingestion] Starting general trending ingestion for categories: ${categoriesToIngest.join(', ')}`);

  // Get keywords ingested in the last 24 hours to exclude them from trend extraction
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentArticles = await prisma.article.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: {
      keyword: true,
    },
  });
  const excludedKeywords = Array.from(new Set(recentArticles.map(a => a.keyword).filter(Boolean)));
  console.log(`[Ingestion] Excluded keywords from the last 24 hours:`, excludedKeywords);

  const runningExcludedKeywords = [...excludedKeywords];

  for (const cat of categoriesToIngest) {
    const url = CATEGORY_FEEDS[cat];
    if (!url) continue;

    try {
      console.log(`[Ingestion] Fetching feed for category: ${cat}`);
      const feed = await parser.parseURL(url);
      if (!feed.items || feed.items.length === 0) continue;

      const headlines = feed.items.slice(0, 40).map(item => item.title || '');
      const trendingKeywords = await extractTrendingKeywords(cat, headlines, runningExcludedKeywords);
      console.log(`[Ingestion] Category "${cat}" trending keywords:`, trendingKeywords);

      for (const keyword of trendingKeywords) {
        // Deduplication: check if keyword exists today
        const existing = await prisma.article.findFirst({
          where: {
            keyword: { equals: keyword, mode: 'insensitive' },
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        });

        if (existing) {
          console.log(`[Ingestion] Topic "${keyword}" already ingested today. Skipping.`);
          skippedCount++;
          continue;
        }

        console.log(`[Ingestion] Processing trending topic: "${keyword}"`);
        const searchItems = await fetchArticlesForKeyword(keyword);
        if (searchItems.length === 0) {
          skippedCount++;
          continue;
        }

        try {
          markIngestionScraping(scope);
          const crawled = await crawlSources(searchItems);
          const synthesis = await synthesizeTrendDossier(keyword, crawled);

          // Extract domains of sources to cite
          const sourceDomains = Array.from(
            new Set(
              searchItems
                .map((item) => {
                  try {
                    const urlObj = new URL(item.url);
                    return urlObj.hostname.replace('www.', '');
                  } catch {
                    return '';
                  }
                })
                .filter((domain) => domain && !domain.includes('google.com'))
            )
          ).slice(0, 4);

          const finalContentBlocks = [...synthesis.contentBlocks];
          if (sourceDomains.length > 0) {
            finalContentBlocks.push(`Sources Cited: ${sourceDomains.join(', ')}`);
          }
          
          const imageResult = await getCopyrightFreeImage(
            synthesis.imageSearchQuery,
            cat || synthesis.categories[0] || 'News',
            synthesis.aiImagePrompt,
            synthesis.imageSearchQueryFallbacks,
            synthesis.headline,
            synthesis.imageSearchSubject
          );
          
          const articleCats = cat 
            ? [cat, ...synthesis.categories.filter((c: string) => c !== cat)]
            : synthesis.categories;
          
          const createdArticle = await prisma.article.create({
            data: {
              keyword,
              headline: synthesis.headline,
              summary: synthesis.summary,
              contentBlocks: finalContentBlocks,
              sectionHeadings: synthesis.sectionHeadings || [],
              highlightedFacts: synthesis.highlightedFacts || [],
              sentiment: synthesis.sentiment,
              categories: articleCats,
              imageUrl: imageResult.imageUrl,
              imageUrls: imageResult.imageUrls,
              enrichmentStatus: 'complete'
            }
          });

          ingestedCount++;
          await indexArticleInRag(createdArticle);
          runningExcludedKeywords.push(keyword);
          await invalidateCache(articleCats);
          
          // Trigger the Social Posting microservice (fire and forget)
          void triggerSocialPostingPipeline(createdArticle.id, synthesis.aiImagePrompt);
        } catch (keywordErr) {
          console.error(`[Ingestion] Failed synthesis for topic "${keyword}":`, keywordErr);
          errorsCount++;
        }
      }
    } catch (catErr) {
      console.error(`[Ingestion] Failed category processing for ${cat}:`, catErr);
      errorsCount++;
    }
  }

  return { ingestedCount, skippedCount, errorsCount };
}

/**
 * GET /api/news/ingest/status
 */
export function getIngestionStatusHandler(_req: Request, res: Response) {
  const search = _req.query.search as string | undefined;
  const scope: IngestionScope = search && search.trim() ? 'search' : 'general';

  let status = getIngestionStatus(scope);
  if (scope === 'general' && status.status === 'idle') {
    const searchStatus = getIngestionStatus('search');
    if (searchStatus.status === 'processing' || searchStatus.status === 'scraping') {
      status = searchStatus;
    }
  }

  res.status(200).json({
    success: true,
    ...status,
  });
}

/**
 * POST /api/news/ingest — returns 202 immediately; pipeline runs in background.
 */
export async function triggerIngestion(req: Request, res: Response) {
  const category = req.query.category as string;
  const country = req.query.country as string;
  const search = req.query.search as string;
  const scope: IngestionScope = search && search.trim() ? 'search' : 'general';

  if (isIngestionRunning(scope)) {
    const currentStatus = getIngestionStatus(scope);

    if (scope === 'search' && currentStatus.query && currentStatus.query.toLowerCase() !== search.trim().toLowerCase()) {
      const { message: _message, ...statusWithoutMessage } = currentStatus;
      return res.status(409).json({
        success: false,
        ...statusWithoutMessage,
        message: `Another search ingestion is already running for "${currentStatus.query}". Please wait a moment and try again.`,
      });
    }

    return res.status(202).json({
      success: true,
      ...currentStatus,
    });
  }

  markIngestionStarted(scope, search?.trim() || undefined);

  res.status(202).json({
    success: true,
    status: 'processing',
    scope,
    query: search?.trim() || undefined,
    message: scope === 'search'
      ? `Search ingestion started for "${search.trim()}". Poll /api/news/ingest/status?search=${encodeURIComponent(search.trim())} for progress.`
      : 'Ingestion pipeline started. Poll /api/news/ingest/status for progress.',
  });

  void runIngestionPipeline(category, country, search, scope)
    .then((result) => {
      markIngestionComplete(scope, {
        ingestedCount: result.ingestedCount,
        skippedCount: result.skippedCount,
        errorsCount: result.errorsCount,
      });
    })
    .catch((error: Error) => {
      markIngestionError(scope, error.message || 'Unknown error');
    });
}
