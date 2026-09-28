import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchNews, triggerIngest, Article, IngestResult } from '../lib/api';

const STUB_REFRESH_INTERVAL_MS = 4_000;

export function useNews(category?: string, search?: string, initialArticles: Article[] = []) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [loading, setLoading] = useState<boolean>(initialArticles.length === 0);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [sentimentFilter, setSentimentFilter] = useState<'All' | 'Positive'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const stubPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStubPolling = useCallback(() => {
    if (stubPollRef.current) {
      clearInterval(stubPollRef.current);
      stubPollRef.current = null;
    }
  }, []);

  const loadNews = useCallback(async (showLoading = true) => {
    if (search) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(category);
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news articles.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [category, search]);

  const loadSearchResults = useCallback(async (query: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(undefined, query);
      setArticles(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch news articles.');
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const startStubPolling = useCallback(
    (refreshFn: () => Promise<Article[] | void>) => {
      stopStubPolling();
      stubPollRef.current = setInterval(() => {
        void refreshFn();
      }, STUB_REFRESH_INTERVAL_MS);
    },
    [stopStubPolling]
  );

  const runBackgroundIngest = useCallback(
    async (refreshFn: () => Promise<Article[] | void>, overrideSearch?: string): Promise<IngestResult> => {
      setIngesting(true);

      let queryCategory: string | undefined;
      let queryCountry: string | undefined;
      let querySearch: string | undefined;

      if (overrideSearch) {
        querySearch = overrideSearch;
      } else if (search) {
        querySearch = search;
      } else if (category === 'India') {
        queryCountry = 'IN';
      } else if (category === 'World') {
        queryCategory = 'world';
      } else if (category === 'Tech') {
        queryCategory = 'technology';
      } else if (category && category !== 'Home') {
        queryCategory = category.toLowerCase();
      }

      await refreshFn();
      startStubPolling(refreshFn);

      try {
        const res = await triggerIngest(queryCategory, queryCountry, querySearch);
        await refreshFn();
        return res;
      } catch (err: any) {
        console.error(err);
        return {
          success: false,
          message: err.message || 'Failed to trigger ingestion pipeline.',
          ingestedCount: 0,
          skippedCount: 0,
          errorsCount: 0,
        };
      } finally {
        stopStubPolling();
        setIngesting(false);
      }
    },
    [category, search, startStubPolling, stopStubPolling]
  );

  const runManualIngest = useCallback(async () => {
    const refreshFn = () => (search ? loadSearchResults(search, false) : loadNews(false));
    return runBackgroundIngest(refreshFn, search);
  }, [search, loadNews, loadSearchResults, runBackgroundIngest]);

  const runSearch = useCallback(
    async (query: string) => {
      setError(null);
      setArticles([]);
      setLoading(true);
      setIngesting(false);

      try {
        const existing = await loadSearchResults(query, true);
        const hadCachedResults = existing.length > 0;

        // Skip ingestion if there is an article created in the last 4 hours
        const fourHoursInMs = 4 * 60 * 60 * 1000;
        const hasRecentArticle = existing.some(
          (art) => Date.now() - new Date(art.createdAt).getTime() < fourHoursInMs
        );

        if (hasRecentArticle) {
          return {
            success: true,
            message: 'Showing recent articles from database.',
            ingestedCount: 0,
            skippedCount: 0,
            errorsCount: 0,
            hadCachedResults,
            cachedCount: existing.length,
          };
        }

        const res = await runBackgroundIngest(() => loadSearchResults(query, false), query);

        return { ...res, hadCachedResults, cachedCount: existing.length };
      } catch (err: any) {
        setError(err.message || 'Failed to search news.');
        return {
          success: false,
          message: err.message || 'Failed to search news.',
          ingestedCount: 0,
          skippedCount: 0,
          errorsCount: 0,
          hadCachedResults: false,
          cachedCount: 0,
        };
      } finally {
        setLoading(false);
      }
    },
    [loadSearchResults, runBackgroundIngest]
  );

  const initialCategoryRef = useRef(category);
  const initialSearchRef = useRef(search);
  const hasLoadedInitial = useRef(initialArticles.length > 0);

  useEffect(() => {
    // If we have initial articles and this is the category/search we started with,
    // do not trigger a fetch on mount/load. This prevents reload/hydration flickers.
    if (hasLoadedInitial.current && category === initialCategoryRef.current && search === initialSearchRef.current) {
      return;
    }

    if (!search) {
      const timer = setTimeout(() => {
        loadNews();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [category, search, loadNews]);

  useEffect(() => () => stopStubPolling(), [stopStubPolling]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (sentimentFilter === 'Positive' && article.sentiment !== 'Positive') {
        return false;
      }
      if (categoryFilter !== 'All' && !article.categories.includes(categoryFilter)) {
        return false;
      }
      return true;
    });
  }, [articles, sentimentFilter, categoryFilter]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach((a) => {
      if (Array.isArray(a.categories)) {
        a.categories.forEach((c) => cats.add(c));
      }
    });
    return Array.from(cats);
  }, [articles]);

  const hasPendingArticles = useMemo(
    () => articles.some((a) => a.enrichmentStatus === 'pending'),
    [articles]
  );

  useEffect(() => {
    if (hasPendingArticles) {
      const interval = setInterval(() => {
        if (search) {
          void loadSearchResults(search, false);
        } else {
          void loadNews(false);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasPendingArticles, search, loadSearchResults, loadNews]);

  return {
    articles,
    filteredArticles,
    loading,
    ingesting,
    hasPendingArticles,
    error,
    sentimentFilter,
    setSentimentFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    refresh: () => (search ? loadSearchResults(search) : loadNews(true)),
    triggerIngest: runManualIngest,
    searchNews: runSearch,
  };
}

export type UseNewsReturn = ReturnType<typeof useNews>;
