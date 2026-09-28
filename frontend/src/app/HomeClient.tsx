'use client';

import React, { useState, useEffect, useMemo, startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useNews } from '../hooks/useNews';
import { Article } from '../lib/api';
import { articlePath, categoryPath, optimizeImageUrl } from '../lib/seo';
import { Clock, RefreshCw, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import ShareDialog from '../components/ShareDialog';
import ScrollReveal from '../components/ScrollReveal';
import ImageSourceBadge from '../components/ImageSourceBadge';
import AdBanner from '../components/AdBanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const CAT_COLORS: Record<string, string> = {
  Tech: '#1565c0', Business: '#2e7d32', Finance: '#6a1b9a',
  Science: '#00695c', Health: '#ad1457', Entertainment: '#e65100',
  Politics: '#b71c1c', India: '#c62828', World: '#37474f', Sports: '#d84315', Default: '#455a64',
};

function catColor(cat?: string) {
  return CAT_COLORS[cat || ''] || CAT_COLORS.Default;
}

// ─── Shared: Image placeholder ────────────────────────────────────────────────

function ImgBox({ article, height = 180, style = {}, priority = false }: { article: Article; height?: number; style?: React.CSSProperties; priority?: boolean }) {
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const [imgError, setImgError] = useState(false);
  const hasImage = !!article.imageUrl && !imgError;

  if (article.enrichmentStatus === 'pending') {
    return (
      <div 
        className="skeleton-pulse"
        style={{
          height,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
          border: '1px solid var(--border-primary)',
          ...style,
        }}
      >
        <span style={{ color: 'var(--color-ink-faint)', fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Loading Image...</span>
      </div>
    );
  }

  if (hasImage) {
    let targetWidth = 640;
    if (height <= 80) targetWidth = 150;
    else if (height <= 150) targetWidth = 400;
    else targetWidth = 800;

    const optimizedUrl = optimizeImageUrl(article.imageUrl, targetWidth);

    return (
      <div style={{
        height,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: `linear-gradient(140deg, ${bg}dd 0%, ${bg}77 100%)`,
        ...style,
      }}>
        <Image
          src={optimizedUrl}
          alt={article.headline}
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          unoptimized
          onError={() => setImgError(true)}
          priority={priority}
          style={{
            objectFit: 'cover',
          }}
          className="img-fade-in"
        />
        <ImageSourceBadge imageUrl={article.imageUrl} />
      </div>
    );
  }

  return (
    <div style={{
      height,
      background: `linear-gradient(140deg, ${bg}dd 0%, ${bg}77 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      ...style,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 48, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-serif)' }}>DNI</span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{cat || 'News'}</span>
    </div>
  );
}

// ─── Shared: Category tag ─────────────────────────────────────────────────────

function CatTag({ cat }: { cat?: string }) {
  const label = cat || 'India';
  return (
    <span style={{
      display: 'inline-block',
      background: catColor(cat),
      color: '#fff', fontSize: 12, fontWeight: 800,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 2, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function EnrichingBadge() {
  return (
    <span style={{
      display: 'inline-block', marginLeft: 6,
      background: '#fff8e1', color: '#f57f17', fontSize: 12, fontWeight: 800,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 2, border: '1px solid #ffe082',
    }}>
      Updating
    </span>
  );
}

// ─── Breaking ticker ─────────────────────────────────────────────────────────

function BreakingTicker({ articles }: { articles: Article[] }) {
  const texts = articles.length > 0
    ? [...articles, ...articles].map(a => a.headline)
    : ['Daily News Insights: AI-Powered News Platform — Updated On Demand', 'Breaking coverage from India and the world, synthesized by Gemini 1.5 Flash', 'Live pipeline: Firecrawl extraction • Supabase storage • Upstash caching'];

  return (
    <div style={{ display: 'flex', background: 'var(--ticker-bg)', overflow: 'hidden', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 14px',
        background: 'var(--ticker-label-bg)', color: '#fff', fontSize: 12, fontWeight: 800,
        letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        borderRight: '2px solid rgba(0,0,0,0.15)', gap: 6, height: 36,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
        BREAKING
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div className="ticker-track" style={{ display: 'flex', width: 'max-content', alignItems: 'center', height: 36 }}>
          {texts.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', color: '#fff', fontSize: 13, padding: '0 28px', whiteSpace: 'nowrap', gap: 10 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Article Cards ────────────────────────────────────────────────────────────

function FeatureCard({ article, index = 0 }: { article: Article; index?: number }) {
  const [hov, setHov] = useState(false);
  const firstSentence = article.summary?.[0] ?? '';

  return (
    <Link
      href={articlePath(article.categories?.[0] || 'news', article.headline)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', animationDelay: `${index * 50}ms` }}
    >
      <div style={{ overflow: 'hidden', borderRadius: 3 }}>
        <ImgBox article={article} height={230} style={{ transform: hov ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.35s ease' }} priority={true} />
      </div>
      <div style={{ marginTop: 'var(--spacing-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--fs-xl)', fontWeight: 800, lineHeight: 1.25, marginTop: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)',
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
        }}>
          {article.headline}
        </h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-ink-muted)', lineHeight: 1.65, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)' }}>
          <Clock style={{ width: 11, height: 11 }} aria-hidden="true" />
          <time dateTime={new Date(article.createdAt).toISOString()}>{timeAgo(article.createdAt)}</time>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ article, showDivider = true, index = 0 }: { article: Article; showDivider?: boolean; index?: number }) {
  const [hov, setHov] = useState(false);
  return (
    <>
      {showDivider && <div style={{ height: 1, background: 'var(--border-secondary)', margin: '0' }} />}
      <Link
        href={articlePath(article.categories?.[0] || 'news', article.headline)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        className="card-entrance"
        style={{
          display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', textDecoration: 'none', color: 'inherit',
          animationDelay: `${index * 50}ms`,
        }}
      >
        <div style={{ flexShrink: 0, width: 82, height: 62, borderRadius: 3, overflow: 'hidden' }}>
          <ImgBox article={article} height={62} style={{ transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.3s', width: 82 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <CatTag cat={article.categories?.[0]} />
            {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
          </div>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--fs-base)', fontWeight: 700, lineHeight: 1.3, marginTop: 5,
            color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.headline}
          </h3>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-ghost)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} aria-hidden="true" />
            <time dateTime={new Date(article.createdAt).toISOString()}>{timeAgo(article.createdAt)}</time>
          </div>
        </div>
      </Link>
    </>
  );
}

function GridCard({ article, index = 0 }: { article: Article; index?: number }) {
  const [hov, setHov] = useState(false);
  const firstSentence = article.summary?.[0] ?? '';
  return (
    <Link
      href={articlePath(article.categories?.[0] || 'news', article.headline)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit', borderRadius: 4, overflow: 'hidden',
        border: '1px solid var(--border-primary)',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.25s',
        animationDelay: `${index * 50}ms`,
        background: 'var(--bg-elevated)',
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <ImgBox article={article} height={140} style={{ transform: hov ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.35s' }} />
      </div>
      <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--fs-base)', fontWeight: 700, lineHeight: 1.3, marginTop: 7, marginBottom: 5,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h3>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-ink-muted)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {firstSentence}
        </p>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-ghost)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock style={{ width: 10, height: 10 }} aria-hidden="true" />
          <time dateTime={new Date(article.createdAt).toISOString()}>{timeAgo(article.createdAt)}</time>
        </div>
      </div>
    </Link>
  );
}

function SidebarItem({ article, rank, index = 0 }: { article: Article; rank: number; index?: number }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={articlePath(article.categories?.[0] || 'news', article.headline)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="card-entrance"
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', padding: 'var(--spacing-sm) 0',
        borderBottom: '1px solid var(--border-faint)', textDecoration: 'none', color: 'inherit',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, color: 'var(--color-ink-faint)', fontFamily: 'Georgia, serif', lineHeight: 1, flexShrink: 0, minWidth: 26, textAlign: 'right' }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <CatTag cat={article.categories?.[0]} />
          {article.enrichmentStatus === 'pending' && <EnrichingBadge />}
        </div>
        <h4 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--fs-sm)', fontWeight: 700, lineHeight: 1.35, marginTop: 5,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)', transition: 'color 0.2s',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {article.headline}
        </h4>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-ghost)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Clock style={{ width: 10, height: 10 }} aria-hidden="true" />
          <time dateTime={new Date(article.createdAt).toISOString()}>{timeAgo(article.createdAt)}</time>
        </div>
      </div>
    </Link>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', paddingBottom: 10, borderBottom: '2px solid var(--color-ink)' }}>
      <div style={{ width: 4, height: 20, background: 'var(--ir-crimson)', borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-lg)', fontWeight: 900, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: 'var(--border-primary)', marginLeft: 4 }} />
    </div>
  );
}

// ─── Home Page Skeleton ───────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
      <div className="ir-home-grid" style={{ marginBottom: 36 }}>
      {/* LEFT COLUMN SKELETON */}
      <aside style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 24 }}>
        <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 16 }}>
          <div className="skeleton-pulse" style={{ width: 100, height: 14, borderRadius: 3 }} />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ padding: '16px 0', borderBottom: i < 4 ? '1px solid var(--border-secondary)' : 'none' }}>
            <div className="skeleton-pulse" style={{ width: 60, height: 10, marginBottom: 8, borderRadius: 2 }} />
            <div className="skeleton-pulse" style={{ width: '100%', height: 14, marginBottom: 6, borderRadius: 3 }} />
            <div className="skeleton-pulse" style={{ width: '80%', height: 14, borderRadius: 3 }} />
          </div>
        ))}
      </aside>

      {/* CENTER COLUMN SKELETON */}
      <div style={{ borderRight: '1px solid var(--border-secondary)', paddingRight: 24 }}>
        {/* Featured Hero Skeleton */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="skeleton-pulse" style={{ width: '100%', height: 230, borderRadius: 6, marginBottom: 16 }} />
          <div className="skeleton-pulse" style={{ width: 80, height: 12, borderRadius: 2, marginBottom: 12 }} />
          <div className="skeleton-pulse" style={{ width: '90%', height: 24, borderRadius: 4, marginBottom: 12 }} />
          <div className="skeleton-pulse" style={{ width: '100%', height: 14, borderRadius: 3, marginBottom: 6 }} />
          <div className="skeleton-pulse" style={{ width: '95%', height: 14, borderRadius: 3 }} />
        </div>
        {/* Center Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="skeleton-pulse" style={{ width: '100%', height: 130, borderRadius: 6, marginBottom: 12 }} />
              <div className="skeleton-pulse" style={{ width: '90%', height: 14, borderRadius: 3, marginBottom: 6 }} />
              <div className="skeleton-pulse" style={{ width: '70%', height: 14, borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN SKELETON */}
      <aside>
        <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 16 }}>
          <div className="skeleton-pulse" style={{ width: 100, height: 14, borderRadius: 3 }} />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: i < 5 ? '1px solid var(--border-secondary)' : 'none' }}>
            <div className="skeleton-pulse" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-pulse" style={{ width: 50, height: 10, marginBottom: 6, borderRadius: 2 }} />
              <div className="skeleton-pulse" style={{ width: '100%', height: 14, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomeClient({ initialArticles, initialNav = 'Home' }: { initialArticles: Article[]; initialNav?: string }) {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState(initialNav);
  const [activeSearch, setActiveSearch] = useState<string | undefined>(undefined);
  const { articles, loading, ingesting, hasPendingArticles, refresh, triggerIngest, searchNews } = useNews(activeNav, activeSearch, initialArticles);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [progress, setProgress] = useState(0);
  const isLoadingOrIngesting = loading || ingesting;

  useEffect(() => {
    let timer: any;
    if (isLoadingOrIngesting) {
      setProgress(5);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          // Smooth increments
          const diff = prev < 40 ? 10 : prev < 70 ? 5 : prev < 85 ? 2 : 1;
          return prev + diff;
        });
      }, 600);
    } else {
      setProgress(100);
      timer = setTimeout(() => {
        setProgress(0);
      }, 800);
    }
    return () => {
      clearInterval(timer);
      clearTimeout(timer);
    };
  }, [isLoadingOrIngesting]);

  const filtered = useMemo(() => {
    let list = articles;
    if (!activeSearch) {
      const cat = activeNav === 'Home' ? null : activeNav;
      if (cat) list = list.filter(a => a.categories?.includes(cat));
    }
    return list;
  }, [articles, activeNav, activeSearch]);

  const handleIngest = async () => {
    const res = await triggerIngest();
    setToast({ msg: res.success ? `✓ Added ${res.ingestedCount} new stories` : '✗ ' + res.message, ok: res.success });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSearch = async (q: string) => {
    if (!q) return;
    setActiveNav('Home');
    setActiveSearch(q);
    const res = await searchNews(q);
    const toastMsg = !res.success
      ? '✗ ' + res.message
      : res.ingestedCount > 0
        ? `✓ Added ${res.ingestedCount} new stories for "${q}"`
        : res.hadCachedResults
          ? `✓ Showing ${res.cachedCount} stories for "${q}" (already up to date)`
          : `✓ No stories found for "${q}"`;
    setToast({ msg: toastMsg, ok: res.success });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setSearchQuery(q);
        handleSearch(q);
        // Clean URL so the query parameter is not sticky
        window.history.replaceState(null, '', '/');
      }
    }
  }, []);

  const handleNavChange = (nav: string) => {
    const target = nav === 'Home' ? '/' : categoryPath(nav);

    void router.prefetch(target);

    startTransition(() => {
      router.push(target);
    });
  };

  // Layout slots
  const isCategoryView = activeNav !== 'Home' && !activeSearch;
  
  const topStories = isCategoryView
    ? filtered.filter(a => a.categories?.[0] === activeNav)
    : filtered;

  // 1. Sort by 24h view count (descending), then by recency if counts are equal
  const mostViewed = [...topStories].sort((a, b) => {
    const viewA = a.viewCount24h || 0;
    const viewB = b.viewCount24h || 0;
    if (viewB !== viewA) return viewB - viewA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 2. Sort by recency (createdAt descending)
  const latestNews = [...topStories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Distribute articles uniquely to avoid any duplication on the page
  const centerHero = mostViewed[0];

  const leftFeed = mostViewed.filter(a => a.id !== centerHero?.id).slice(0, 4);

  const usedIds = new Set<string>();
  if (centerHero) usedIds.add(centerHero.id);
  leftFeed.forEach(a => usedIds.add(a.id));

  const centerGrid = latestNews.filter(a => !usedIds.has(a.id)).slice(0, 4);
  centerGrid.forEach(a => usedIds.add(a.id));

  const rightFeed = latestNews.filter(a => !usedIds.has(a.id)).slice(0, 5);
  rightFeed.forEach(a => usedIds.add(a.id));

  const bottomStories = isCategoryView
    ? filtered.filter(a => a.categories?.includes(activeNav) && a.categories?.[0] !== activeNav && !usedIds.has(a.id))
    : latestNews.filter(a => !usedIds.has(a.id));

  const breakingArticles = useMemo(() => articles.slice(0, 6), [articles]);

  const sectionTitle = activeSearch 
    ? `Results for "${activeSearch}"` 
    : activeNav === 'Home' 
      ? 'More Stories' 
      : `Related ${activeNav} Stories`;

  const gridTemplateColumns = [
    leftFeed.length > 0 ? '240px' : '',
    (centerHero || centerGrid.length > 0) ? '1fr' : '',
    rightFeed.length > 0 ? '240px' : ''
  ].filter(Boolean).join(' ');

  const leftColumnStyle = {
    borderRight: (centerHero || centerGrid.length > 0 || rightFeed.length > 0)
      ? '1px solid var(--border-secondary)'
      : 'none',
    paddingRight: 'var(--spacing-lg)'
  };

  const centerColumnStyle = {
    borderRight: rightFeed.length > 0
      ? '1px solid var(--border-secondary)'
      : 'none',
    paddingRight: rightFeed.length > 0 ? 'var(--spacing-lg)' : 0
  };

  return (
    <Layout
      activeNav={activeNav}
      onNavChange={handleNavChange}
      onSearch={handleSearch}
      onIngest={handleIngest}
      ingesting={ingesting}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      showNav={true}
      showBreakingTicker={true}
      breakingArticles={breakingArticles}
    >
      {/* Toast */}
      {toast && (
        <div className="ir-toast" style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? '#14532d' : '#7f1d1d',
          color: '#fff', padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="ir-container" style={{ padding: 'var(--spacing-md) var(--container-padding)' }}>

        {/* Unified full-page loader with progress bar block */}
        {ingesting && filtered.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 20px', width: '100%' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 4,
              border: '1px solid var(--border-primary)',
              background: ingesting
                ? `linear-gradient(to right, var(--ir-crimson-bg) ${progress}%, var(--bg-tertiary) ${progress}%)`
                : 'var(--bg-tertiary)',
              fontSize: 13,
              color: 'var(--color-ink-muted)',
              transition: 'background 0.1s ease',
              width: '100%',
              maxWidth: 600
            }}>
              <RefreshCw style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite', color: 'var(--ir-crimson)' }} aria-hidden="true" />
              <span style={{ fontWeight: 500 }}>
                {activeSearch
                  ? `Fetching latest stories for "${activeSearch}"${ingesting ? ` (${Math.round(progress)}%)` : ''}…`
                  : ingesting
                    ? `Updating feed${ingesting ? ` (${Math.round(progress)}%)` : ''}…`
                    : 'AI is enriching summaries in the background…'}
              </span>
            </div>
          </div>
        )}

        {/* Background refresh banner */}
        {!loading && (activeSearch ? ingesting : (ingesting || hasPendingArticles)) && filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', marginBottom: 16, borderRadius: 4,
            border: '1px solid var(--border-primary)',
            background: ingesting
              ? `linear-gradient(to right, var(--ir-crimson-bg) ${progress}%, var(--bg-tertiary) ${progress}%)`
              : 'var(--bg-tertiary)',
            fontSize: 13,
            color: 'var(--color-ink-muted)',
            transition: 'background 0.1s ease',
            width: '100%'
          }}>
            <RefreshCw style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite', color: 'var(--ir-crimson)' }} aria-hidden="true" />
            <span style={{ fontWeight: 500 }}>
              {activeSearch
                ? `Fetching latest stories for "${activeSearch}"${ingesting ? ` (${Math.round(progress)}%)` : ''}…`
                : ingesting
                  ? `Updating feed${ingesting ? ` (${Math.round(progress)}%)` : ''}…`
                  : 'AI is enriching summaries in the background…'}
            </span>
          </div>
        )}

        {/* No articles */}
        {!loading && !ingesting && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 16, color: 'var(--color-ink-faint)', fontWeight: 600 }}>No stories found</p>
            <p style={{ fontSize: 13, color: 'var(--color-ink-ghost)', marginTop: 6 }}>{activeSearch ? `No results for "${activeSearch}". Try a different topic.` : 'Try another category or click Update Feed.'}</p>
          </div>
        )}

        {loading ? (
          <HomeSkeleton />
        ) : (
          (topStories.length > 0 || bottomStories.length > 0) && (
            <>
            <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_HOMEPAGE_SLOT} adFormat="horizontal" />
            {/* 3-column grid */}
            {topStories.length > 0 && (
              <div className="ir-home-grid" style={{ marginBottom: 36, gridTemplateColumns: gridTemplateColumns || undefined }}>

                {/* LEFT COLUMN */}
                {leftFeed.length > 0 && (
                  <aside style={leftColumnStyle}>
                    <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink)' }}>Top Stories</span>
                    </div>
                    {leftFeed.map((a, i) => <CompactCard key={a.id} article={a} showDivider={i > 0} index={i} />)}
                  </aside>
                )}

                {/* CENTER COLUMN */}
                {(centerHero || centerGrid.length > 0) && (
                  <div style={centerColumnStyle}>
                    {centerHero && (
                      <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-secondary)' }}>
                        <FeatureCard article={centerHero} index={0} />
                      </div>
                    )}
                    {centerGrid.length > 0 && (
                      <div className="ir-center-grid">
                        {centerGrid.map((a, i) => <GridCard key={a.id} article={a} index={i + 1} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* RIGHT COLUMN */}
                {rightFeed.length > 0 && (
                  <aside style={{ paddingLeft: 0 }}>
                    <div style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 8, marginBottom: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink)' }}>Latest News</span>
                    </div>
                    {rightFeed.map((a, i) => <SidebarItem key={a.id} article={a} rank={i + 1} index={i} />)}
                  </aside>
                )}
              </div>
            )}

            {/* Section row: more stories */}
            {bottomStories.length > 0 && (
              <>
                <ScrollReveal>
                  <section style={{ marginBottom: 36 }}>
                    <SectionHead title={sectionTitle} />
                    <div className="ir-more-stories-grid">
                      {bottomStories.slice(0, 4).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                    </div>
                  </section>
                </ScrollReveal>
                
                <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_HOMEPAGE_SLOT} adFormat="horizontal" />
              </>
            )}

            {/* Extra stories */}
            {bottomStories.slice(4).length > 0 && (
              <ScrollReveal>
                <section style={{ marginBottom: 36 }}>
                  <SectionHead title={isCategoryView ? "Other Related Reports" : "All Reports"} />
                  <div className="ir-more-stories-grid">
                    {bottomStories.slice(4).map((a, i) => <GridCard key={a.id} article={a} index={i} />)}
                  </div>
                </section>
              </ScrollReveal>
            )}
          </>
        ))}
      </main>
    </Layout>
  );
}
