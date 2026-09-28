import { NextResponse } from 'next/server';
import { articleUrl, fetchHomeArticles, SITE_NAME, siteUrl } from '../../lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

export async function GET() {
  const articles = await fetchHomeArticles();

  const feedItems = articles
    .map((article) => {
      const url = articleUrl(article.categories?.[0] || 'news', article.headline);
      const firstSummary = article.summary?.find(Boolean);
      const fallback = firstSummary || article.headline;
      const description = fallback.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      
      return `
    <item>
      <title><![CDATA[${article.headline}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(article.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
      ${article.categories?.[0] ? `<category>${article.categories[0]}</category>` : ''}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${siteUrl}</link>
    <description>India's Autonomous News Intelligence Platform</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${feedItems}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400',
    },
  });
}
