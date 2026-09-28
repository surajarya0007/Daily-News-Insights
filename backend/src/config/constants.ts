/** How many new articles to pull from Google News RSS per ingest run */
export const INGEST_LIMIT = 15;

/** How many articles GET /api/news returns from DB/Redis for the homepage */
export const DISPLAY_LIMIT = 15;

/** @deprecated Use INGEST_LIMIT or DISPLAY_LIMIT */
export const ARTICLE_FETCH_LIMIT = INGEST_LIMIT;

/** Max characters of scraped text sent to Gemini */
export const GEMINI_INPUT_MAX_CHARS = 2_500;

/** Use Google Search in Gemini only when scraped text is shorter than this */
export const GEMINI_SEARCH_MIN_CHARS = 500;

/** Gemini models tried in order; falls back to the next on 429 / quota errors */
export const GEMINI_MODEL_CHAIN = [
  'gemini-3.1-flash-lite',
] as const;

/** Default delay between articles during ingestion (primary model ~5 RPM) */
export const GEMINI_RPM_DELAY_MS = 6_000;

/** Per-model RPM pacing delay after a successful synthesis */
export const GEMINI_RPM_DELAY_BY_MODEL: Record<string, number> = {
  'gemini-3.1-flash-lite': 6_000,
};

/** Max articles scraped in parallel during ingestion */
export const SCRAPE_CONCURRENCY = 10;
