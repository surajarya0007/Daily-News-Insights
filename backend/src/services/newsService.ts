import dotenv from 'dotenv';
import Parser from 'rss-parser';
import { INGEST_LIMIT } from '../config/constants';

dotenv.config();

const parser = new Parser({
  customFields: {
    item: [['source', 'source', { keepArray: false }]],
  },
});

export interface RawArticle {
  title: string;
  url: string;
  realUrl?: string;
  source: string;
  publishedAt: string;
  description: string;
  category?: string[];
}

function isGoogleNewsUrl(url: string): boolean {
  return url.includes('news.google.com');
}

function extractHrefFromHtml(html: string): string | undefined {
  const match = html.match(/href=["'](https?:\/\/[^"']+)["']/i);
  if (!match) return undefined;
  const href = match[1];
  return isGoogleNewsUrl(href) ? undefined : href;
}

/**
 * Extract the publisher article URL from a Google News RSS item.
 */
function extractRealUrl(item: any): string | undefined {
  const candidates: (string | undefined)[] = [];

  if (item.source && typeof item.source === 'object' && item.source.$?.url) {
    candidates.push(item.source.$.url);
  }

  if (item.source && typeof item.source === 'string' && item.source.startsWith('http')) {
    candidates.push(item.source);
  }

  if (item.guid && typeof item.guid === 'string' && item.guid.startsWith('http') && !isGoogleNewsUrl(item.guid)) {
    candidates.push(item.guid);
  }

  if (item['content:encoded']) {
    candidates.push(extractHrefFromHtml(item['content:encoded']));
  }

  if (item.content) {
    candidates.push(extractHrefFromHtml(item.content));
  }

  if (item.description) {
    candidates.push(extractHrefFromHtml(item.description));
  }

  if (item.link && !isGoogleNewsUrl(item.link)) {
    candidates.push(item.link);
  }

  for (const url of candidates) {
    if (url && url.startsWith('http') && !isGoogleNewsUrl(url)) {
      return url;
    }
  }

  return undefined;
}

/**
 * Fetch the latest news articles from Google News RSS feed.
 */
export async function fetchLatestNews(category?: string, country?: string, searchQuery?: string): Promise<RawArticle[]> {
  try {
    let query = '';

    if (searchQuery) {
      query = searchQuery;
    } else if (!category && !country) {
      query = 'latest news';
    } else {
      const parts = [];
      if (category) parts.push(category);
      if (country === 'IN') parts.push('India');
      else if (country) parts.push(country);
      query = parts.join(' ');
    }

    const hl = 'en-IN';
    const gl = 'IN';
    const ceid = 'IN:en';

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    console.log(`[NewsService] Fetching Google News RSS: ${url}`);

    const feed = await parser.parseURL(url);
    if (!feed.items || feed.items.length === 0) {
      console.warn('[NewsService] Google News RSS returned empty feed.');
      return [];
    }

    const items = feed.items.slice(0, INGEST_LIMIT);

    return items.map((item) => {
      let cleanTitle = item.title || 'Untitled Article';
      let sourceName = 'Google News';

      const parts = cleanTitle.split(' - ');
      if (parts.length > 1) {
        sourceName = parts.pop()?.trim() || 'Google News';
        cleanTitle = parts.join(' - ').trim();
      }

      const realUrl = extractRealUrl(item);
      if (realUrl) {
        console.log(`[NewsService] Resolved: ${cleanTitle.substring(0, 50)} → ${realUrl.substring(0, 80)}`);
      } else if (item.link) {
        console.warn(`[NewsService] Could not resolve publisher URL for: ${cleanTitle.substring(0, 50)}`);
      }

      const articleCategories: string[] = [];
      if (category) {
        const lower = category.toLowerCase();
        if (lower.includes('tech') || lower.includes('technology')) articleCategories.push('Tech');
        else if (lower.includes('science')) articleCategories.push('Science');
        else if (lower.includes('business')) articleCategories.push('Business');
        else if (lower.includes('finance')) articleCategories.push('Finance');
        else if (lower.includes('politics')) articleCategories.push('Politics');
        else if (lower.includes('entertainment')) articleCategories.push('Entertainment');
        else if (lower.includes('sport')) articleCategories.push('Sports');
        else if (lower.includes('world')) articleCategories.push('World');
        else if (lower.includes('health')) articleCategories.push('Health');
      }

      return {
        title: cleanTitle,
        url: item.link || '',
        realUrl,
        source: sourceName,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        description: item.contentSnippet || item.content || '',
        category: articleCategories,
      };
    });
  } catch (error) {
    console.error('[NewsService] Error fetching from Google News RSS:', error);
    throw error;
  }
}
