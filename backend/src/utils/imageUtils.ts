/** Google News default placeholder logo — always reject this CDN image ID */
const GOOGLE_NEWS_PLACEHOLDER_ID = 'J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc';

/**
 * Returns null when the URL is the generic Google News placeholder logo.
 * Otherwise returns the original URL.
 */
export function sanitizeImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;

  const normalized = url.trim();
  if (!normalized) return null;

  // Match the placeholder by its stable Google CDN image ID (with or without query params)
  if (normalized.includes(GOOGLE_NEWS_PLACEHOLDER_ID)) {
    return null;
  }

  return normalized;
}

/**
 * Strip placeholder images from article objects before API responses / caching.
 */
export function sanitizeArticleImage<T extends { imageUrl?: string | null }>(article: T): T {
  return {
    ...article,
    imageUrl: sanitizeImageUrl(article.imageUrl),
  };
}

/**
 * Perform a quick, lightweight fetch to extract the og:image URL directly from HTML.
 */
export async function extractOgImageFromUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const html = await res.text();

    const ogImageRegex = /<meta[^>]*?(?:property|name)=["'](?:og:image|twitter:image|ogImage)["'][^>]*?content=["']([^"']+)["']/i;
    let match = html.match(ogImageRegex);
    if (match && match[1]) {
      return sanitizeImageUrl(match[1]);
    }

    const ogImageRegexAlt = /<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["'](?:og:image|twitter:image|ogImage)["']/i;
    match = html.match(ogImageRegexAlt);
    if (match && match[1]) {
      return sanitizeImageUrl(match[1]);
    }

    return null;
  } catch (err) {
    return null;
  }
}

