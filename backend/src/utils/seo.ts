import dotenv from 'dotenv';

dotenv.config();

export const DEFAULT_SITE_URL = 'https://www.dailynewsinsights.com';

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  process.env.FRONTEND_URL ||
  DEFAULT_SITE_URL
).replace(/\/$/, '');

export function slugifyHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'article';
}

export function categorySlug(category: string): string {
  return slugifyHeadline(category);
}

export function articlePath(category: string, headline?: string): string {
  const slug = headline ? slugifyHeadline(headline) : 'article';
  return `/${categorySlug(category)}/${slug}`;
}

export function articleUrl(category: string, headline?: string): string {
  return `${siteUrl}${articlePath(category, headline)}`;
}
