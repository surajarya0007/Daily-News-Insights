import { NextResponse } from 'next/server';
import { articleUrl, fetchArticlesForSitemap, SITE_NAME } from '../../lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

export async function GET() {
  const articles = await fetchArticlesForSitemap();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const newsArticles = articles.filter(
    (article) => new Date(article.createdAt) >= fortyEightHoursAgo
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${newsArticles
    .map(
      (article) => `
  <url>
    <loc>${articleUrl(article.categories?.[0] || 'news', article.headline)}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(article.createdAt).toISOString()}</news:publication_date>
      <news:title><![CDATA[${article.headline}]]></news:title>
    </news:news>
  </url>`
    )
    .join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    },
  });
}
