import dotenv from 'dotenv';

dotenv.config();

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

const isRealApiConfigured = (): boolean => {
  return !!(FIRECRAWL_API_KEY && FIRECRAWL_API_KEY !== 'your_firecrawl_key' && !FIRECRAWL_API_KEY.startsWith('your_'));
};

export interface ScrapeResult {
  markdown: string;
}

/**
 * Scrapes the clean text content (markdown) using a fast, native Node fetch.
 * Returns null if the page fails to fetch or returns too little content.
 */
async function fetchAndExtractRawText(url: string): Promise<ScrapeResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const html = await res.text();

    let cleanHtml = html
      .replace(/<script[^>]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*?>[\s\S]*?<\/head>/gi, '')
      .replace(/<nav[^>]*?>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*?>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*?>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]*?id=["'](?:footer|nav|header|menu|sidebar)["'][^>]*?>[\s\S]*?<\/[a-z0-9]+>/gi, '');

    const pRegex = /<p[^>]*?>([\s\S]*?)<\/p>/gi;
    let match;
    const paragraphs: string[] = [];
    while ((match = pRegex.exec(cleanHtml)) !== null) {
      const pText = match[1]
        .replace(/<[^>]*?>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pText.length > 30) {
        paragraphs.push(pText);
      }
    }

    const markdown = paragraphs.join('\n\n');
    if (markdown.trim().length < 200) {
      const bodyMatch = cleanHtml.match(/<body[^>]*?>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        const bodyText = bodyMatch[1]
          .replace(/<[^>]*?>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (bodyText.length > 200) {
          return { markdown: bodyText };
        }
      }
      return null;
    }

    return { markdown };
  } catch (err) {
    return null;
  }
}

/**
 * Resolves a Google News tracking redirect URL to the actual publisher's URL.
 */
async function resolveGoogleNewsUrl(googleRssUrl: string): Promise<string> {
  if (!googleRssUrl || !googleRssUrl.includes('news.google.com')) {
    return googleRssUrl;
  }
  try {
    const res = await fetch(googleRssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return googleRssUrl;
    const html = await res.text();
    
    const match = html.match(/<c-wiz[^>]*?data-p="([^"]+)"/i);
    if (!match) return googleRssUrl;
    
    const dataP = match[1].replace(/&quot;/g, '"');
    const obj = JSON.parse(dataP.replace('%.@.', '["garturlreq",'));
    
    const payload = new URLSearchParams();
    const reqData = [[["Fbv4je", JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), null, "generic"]]];
    payload.append('f.req', JSON.stringify(reqData));

    const postRes = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      body: payload.toString()
    });
    
    if (!postRes.ok) return googleRssUrl;
    const responseText = await postRes.text();
    const parsedText = responseText.replace(")]}'\n\n", "");
    const rootData = JSON.parse(parsedText);
    const innerStr = rootData[0][2];
    const finalUrlObj = JSON.parse(innerStr);
    return finalUrlObj[1] || googleRssUrl;
  } catch (err) {
    console.warn('[ScraperService] Failed to resolve Google News URL:', err);
    return googleRssUrl;
  }
}

/**
 * Scrape the clean text content (markdown) of a given URL.
 * Returns the markdown body.
 */
export async function scrapeArticle(url: string, title: string): Promise<ScrapeResult> {
  const targetUrl = await resolveGoogleNewsUrl(url);

  // 1. Try fast native fetch first
  const fastResult = await fetchAndExtractRawText(targetUrl);
  if (fastResult) {
    console.log(`[ScraperService] Fast native scrape succeeded for: "${title}"`);
    return fastResult;
  }

  // 2. Fall back to Firecrawl
  if (!isRealApiConfigured()) {
    throw new Error('[ScraperService] Fast scrape failed, and Firecrawl API key is not configured.');
  }

  try {
    console.log(`[ScraperService] Fast scrape failed/blocked. Bypassing to Firecrawl: ${targetUrl}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API returned status ${response.status}`);
    }

    const data: any = await response.json();
    if (data.success && data.data) {
      const markdown = typeof data.data.markdown === 'string' ? data.data.markdown : '';
      return { markdown };
    } else {
      console.warn('[ScraperService] Firecrawl returned success=false or missing data. Data:', data);
      throw new Error('Firecrawl parsing failed or returned empty content');
    }
  } catch (error) {
    console.error(`[ScraperService] Failed to scrape ${targetUrl}:`, error);
    throw error;
  }
}
