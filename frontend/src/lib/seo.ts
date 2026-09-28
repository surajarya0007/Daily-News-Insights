import type { Article } from './api';

export const SITE_NAME = 'Daily News Insights';
export const PUBLISHER_NAME = 'Daily News Insights Editorial Desk';
export const DEFAULT_SITE_URL = 'https://www.dailynewsinsights.com';
export const CATEGORY_NAMES = [
  'India',
  'World',
  'Business',
  'Tech',
  'Sports',
  'Science',
  'Finance',
  'Health',
  'Entertainment',
  'Politics',
] as const;

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  DEFAULT_SITE_URL
).replace(/\/$/, '');

const backendUrl = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '')
).replace(/\/$/, '');

export interface ArticleSitemapEntry {
  id: string;
  headline: string;
  createdAt: string;
  updatedAt?: string;
  categories: string[];
}

export function slugifyHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'article';
}

export function articlePath(category: string, headline?: string): string {
  const slug = headline ? slugifyHeadline(headline) : 'article';
  return `/${categorySlug(category)}/${slug}`;
}

export function categorySlug(category: string): string {
  return slugifyHeadline(category);
}

export function categoryNameFromSlug(slug: string): string | null {
  if (slug === 'news') return 'News';
  return CATEGORY_NAMES.find((category) => categorySlug(category) === slug) || null;
}

export function categoryPath(category: string): string {
  return `/category/${categorySlug(category)}`;
}

export function categoryUrl(category: string): string {
  return `${siteUrl}${categoryPath(category)}`;
}

function apiUrl(path: string): string {
  if (!backendUrl) {
    throw new Error('BACKEND_URL is not configured for server-side SEO fetches.');
  }

  return `${backendUrl}${path}`;
}

export function articleUrl(category: string, headline?: string): string {
  return `${siteUrl}${articlePath(category, headline)}`;
}

export async function findArticleByCategoryAndSlug(category: string, slug: string): Promise<Article | null> {
  try {
    const response = await fetch(apiUrl(`/api/news/resolve/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('[SEO] Failed to resolve article by category and slug:', error);
    return null;
  }
}

export function buildArticleDescription(article: Article): string {
  const firstSummary = article.summary?.find(Boolean);
  const firstBlock = article.contentBlocks?.find(Boolean);
  const fallback = firstSummary || firstBlock || article.headline;

  return fallback
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155);
}

export async function fetchArticleForSeo(id: string): Promise<Article | null> {
  try {
    const response = await fetch(apiUrl(`/api/news/${encodeURIComponent(id)}`), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('[SEO] Failed to fetch article:', error);
    return null;
  }
}

export async function fetchArticlesForSitemap(): Promise<ArticleSitemapEntry[]> {
  try {
    const response = await fetch(apiUrl('/api/news/sitemap'), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.success && Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('[SEO] Failed to fetch sitemap articles:', error);
    return [];
  }
}

export interface PaginatedArticles {
  articles: Article[];
  totalPages: number;
  currentPage: number;
}

export async function fetchArticlesForCategory(category: string, page: number = 1): Promise<PaginatedArticles> {
  try {
    const response = await fetch(apiUrl(`/api/news?category=${encodeURIComponent(category)}&page=${page}`), {
      next: { revalidate: 900 },
    });

    if (!response.ok) return { articles: [], totalPages: 0, currentPage: 1 };

    const result = await response.json();
    return {
      articles: result.success && Array.isArray(result.data) ? result.data : [],
      totalPages: result.totalPages || 0,
      currentPage: result.currentPage || 1,
    };
  } catch (error) {
    console.error(`[SEO] Failed to fetch category articles for "${category}":`, error);
    return { articles: [], totalPages: 0, currentPage: 1 };
  }
}

export async function fetchRelatedArticlesForSeo(article: Article): Promise<Article[]> {
  try {
    const searchQuery = article.keyword || article.headline;
    const response = await fetch(apiUrl(`/api/news?search=${encodeURIComponent(searchQuery)}`), {
      next: { revalidate: 300 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const related: Article[] = result.success && Array.isArray(result.data) ? result.data : [];

    // Filter out the current article
    return related.filter((candidate) => candidate.id !== article.id);
  } catch (error) {
    console.error('[SEO] Failed to fetch related articles:', error);
    return [];
  }
}

export async function fetchHomeArticles(): Promise<Article[]> {
  try {
    const response = await fetch(apiUrl('/api/news'), {
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];

    const result = await response.json();
    return result.success && Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('[SEO] Failed to fetch home articles:', error);
    return [];
  }
}

export function optimizeImageUrl(url?: string, width = 640): string {
  if (!url) return '';
  
  // 1. Wikimedia Commons
  if (url.startsWith('https://upload.wikimedia.org/wikipedia/commons/')) {
    if (url.includes('/thumb/')) return url;
    
    // Snapping to standard Wikimedia thumbnail widths: 120, 250, 500, 960, 1280
    let standardWidth = 500;
    if (width <= 120) standardWidth = 120;
    else if (width <= 250) standardWidth = 250;
    else if (width <= 500) standardWidth = 500;
    else if (width <= 960) standardWidth = 960;
    else standardWidth = 1280;

    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    let thumbUrl = url.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/');
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'svg') {
      thumbUrl = `${thumbUrl}/${standardWidth}px-${filename}.png`;
    } else {
      thumbUrl = `${thumbUrl}/${standardWidth}px-${filename}`;
    }
    return thumbUrl;
  }
  
  // 2. Unsplash
  if (url.includes('images.unsplash.com')) {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?w=${width}&q=80&fm=webp&fit=crop`;
  }
  
  // 3. Flickr
  if (url.includes('staticflickr.com')) {
    const parts = url.split('.');
    const ext = parts.pop();
    let base = parts.join('.');
    base = base.replace(/_[sqtmnzcb]$/, '');
    
    let suffix = 'z';
    if (width <= 150) suffix = 'q';
    else if (width <= 320) suffix = 'n';
    else if (width <= 640) suffix = 'z';
    else if (width <= 800) suffix = 'c';
    else suffix = 'b';
    
    return `${base}_${suffix}.${ext || 'jpg'}`;
  }
  
  return url;
}
