'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchArticleById, fetchNews, updateArticleImage, recordArticleView, Article } from '../../../lib/api';
import { articlePath, categoryPath, optimizeImageUrl } from '../../../lib/seo';
import { 
  Clock, 
  ChevronLeft, 
  Share2, 
  TrendingUp, 
  Volume2, 
  Bookmark, 
  Printer, 
  AlertCircle,
  Quote
} from 'lucide-react';
import Layout from '../../../components/Layout';
import ShareDialog from '../../../components/ShareDialog';
import ImageSourceBadge from '../../../components/ImageSourceBadge';
import AdBanner from '../../../components/AdBanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const dateFormatted = d.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).toUpperCase();
  const timeFormatted = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }).toUpperCase();
  return `${dateFormatted} AT ${timeFormatted}`;
}

const CAT_COLORS: Record<string, string> = {
  Tech: '#1565c0', Business: '#2e7d32', Finance: '#6a1b9a',
  Science: '#00695c', Health: '#ad1457', Entertainment: '#e65100',
  Politics: '#b71c1c', India: '#c62828', World: '#37474f', Sports: '#0277bd', Default: '#455a64',
};

function catColor(cat?: string) { 
  return CAT_COLORS[cat || ''] || CAT_COLORS.Default; 
}

// ─── Sidebar article card ─────────────────────────────────────────────────────

function SideCard({ article }: { article: Article }) {
  const [hov, setHov] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const hasImage = !!article.imageUrl && !imgError;
  return (
    <Link
      href={articlePath(article.categories?.[0] || 'news', article.headline)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border-secondary)', textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ 
        flexShrink: 0, 
        width: 80, 
        height: 60, 
        overflow: 'hidden', 
        background: `linear-gradient(135deg, ${bg}22, ${bg}11)`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: '8px',
        position: 'relative'
      }}>
        {hasImage ? (
          <>
            <Image
              src={optimizeImageUrl(article.imageUrl, 150)}
              alt={article.headline}
              fill
              sizes="80px"
              unoptimized
              onError={() => setImgError(true)}
              style={{ objectFit: 'cover' }}
            />
            <ImageSourceBadge imageUrl={article.imageUrl} style={{ bottom: '3px', right: '3px', padding: '1px 4px', fontSize: '7px', borderRadius: '3px' }} />
          </>
        ) : (
          <span style={{ color: bg, fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-serif)', opacity: 0.3 }}>DNI</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {cat && (
          <span style={{ 
            fontSize: 9, 
            fontWeight: 800, 
            color: bg, 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase', 
            display: 'block',
            marginBottom: 4 
          }}>
            {cat} ↗
          </span>
        )}
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 13, 
          fontWeight: 700, 
          lineHeight: 1.35, 
          color: hov ? bg : 'var(--color-ink)', 
          transition: 'color 0.15s',
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden',
          margin: 0
        }}>
          {article.headline}
        </p>
      </div>
    </Link>
  );
}

// ─── More Stories Card ────────────────────────────────────────────────────────

function MoreStoriesCard({ article }: { article: Article }) {
  const [hov, setHov] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cat = article.categories?.[0];
  const bg = catColor(cat);
  const hasImage = !!article.imageUrl && !imgError;
  const summarySnippet = article.summary?.[0] || '';

  return (
    <Link
      href={articlePath(article.categories?.[0] || 'news', article.headline)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? 'var(--shadow-md)' : 'none',
      }}
    >
      <div style={{ height: 130, overflow: 'hidden', background: `linear-gradient(135deg, ${bg}22, ${bg}11)`, position: 'relative' }}>
        {hasImage ? (
          <>
            <Image
              src={optimizeImageUrl(article.imageUrl, 400)}
              alt={article.headline}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              unoptimized
              onError={() => setImgError(true)}
              style={{ objectFit: 'cover', transition: 'transform 0.35s', transform: hov ? 'scale(1.05)' : 'scale(1)' }}
            />
            <ImageSourceBadge imageUrl={article.imageUrl} style={{ bottom: '6px', right: '6px', padding: '2px 6px', fontSize: '9px', borderRadius: '4px' }} />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ color: bg, fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-serif)', opacity: 0.2 }}>DNI</span>
          </div>
        )}
      </div>
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {cat && (
          <span style={{
            fontSize: 9,
            fontWeight: 800,
            color: bg,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 4
          }}>
            {cat}
          </span>
        )}
        <h4 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.35,
          color: hov ? 'var(--ir-crimson)' : 'var(--color-ink)',
          transition: 'color 0.15s',
          margin: '0 0 6px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {article.headline}
        </h4>
        <p style={{
          fontSize: 11.5,
          color: 'var(--color-ink-muted)',
          lineHeight: 1.45,
          margin: '0 0 8px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}>
          {summarySnippet}
        </p>
        <div style={{ fontSize: 10, color: 'var(--color-ink-ghost)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
          <Clock style={{ width: 10, height: 10 }} />
          <span>{new Date(article.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Pull-Quote Callout ───────────────────────────────────────────────────────

function PullQuote({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      margin: 'var(--spacing-xl) 0',
      padding: 'var(--spacing-md) var(--spacing-lg)',
      borderLeft: `5px solid ${color}`,
      background: 'var(--bg-secondary)',
      position: 'relative',
      borderRadius: '8px',
    }}>
      <Quote style={{ 
        width: 28, height: 28, color: color, opacity: 0.3,
        position: 'absolute', top: 16, right: 20
      }} />
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--fs-lg)',
        fontStyle: 'italic',
        fontWeight: 600,
        lineHeight: 1.6,
        color: 'var(--color-ink)',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}

// ─── Inline Markdown Bold Parser ──────────────────────────────────────────────

function renderTextWithBold(text: string, isFirstParagraph?: boolean) {
  const parts = text.split('**');
  const nodes = parts.map((part, idx) => {
    // Odd indices are between **...**
    if (idx % 2 === 1) {
      return <strong key={idx} style={{ color: 'var(--color-ink)', fontWeight: 800 }}>{part}</strong>;
    }
    return part;
  });

  if (isFirstParagraph && nodes.length > 0) {
    // If the first element is a string, extract the drop cap from it
    if (typeof nodes[0] === 'string' && nodes[0].length > 0) {
      const firstStr = nodes[0];
      const firstLetter = firstStr[0];
      const remainingText = firstStr.slice(1);
      nodes[0] = remainingText;
      return (
        <>
          <span className="drop-cap">{firstLetter}</span>
          {nodes}
        </>
      );
    }
  }

  return nodes;
}

// ─── Article body renderer with Section Headings + Pull Quotes ────────────────

function ArticleBody({ 
  contentBlocks, 
  sectionHeadings, 
  highlightedFacts,
  color
}: { 
  contentBlocks?: string[];
  sectionHeadings?: string[];
  highlightedFacts?: string[];
  color: string;
}) {
  if (!contentBlocks || contentBlocks.length === 0) {
    return <p style={{ fontSize: 16, color: 'var(--color-ink-muted)' }}>No content available.</p>;
  }

  // Section headings appear before paragraphs at index 1, 3, 5, 7
  const headingIndices = [1, 3, 5, 7];
  // Pull quotes appear after paragraphs at index 2, 5
  const pullQuoteAfter = [2, 5];

  return (
    <div>
      {contentBlocks.map((para, i) => {
        if (para.startsWith('Sources Cited:')) {
          const sourcesList = para.replace('Sources Cited:', '').trim();
          return (
            <div key={i} style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: '1px dashed var(--border-primary)',
              fontSize: 12,
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap'
            }}>
              <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.04em', color: color }}>Sources Referenced:</span>
              <span style={{ fontStyle: 'italic' }}>{sourcesList}</span>
            </div>
          );
        }

        const isFirst = i === 0;
        const pContent = renderTextWithBold(para, isFirst);

        // Determine which section heading to show (based on position in headingIndices)
        const headingSlot = headingIndices.indexOf(i);
        const heading = headingSlot >= 0 ? (sectionHeadings?.[headingSlot] || null) : null;

        // Determine which pull quote to show after this paragraph
        const pullQuoteSlot = pullQuoteAfter.indexOf(i);
        const pullQuote = pullQuoteSlot >= 0 ? (highlightedFacts?.[pullQuoteSlot] || null) : null;

        return (
          <React.Fragment key={i}>
            {/* Section Heading */}
            {heading && (
              <h3 className="section-subheading" style={{ borderLeft: `4px solid ${color}` }}>
                {heading}
              </h3>
            )}

            {/* Paragraph */}
            <p className="article-paragraph">
              {pContent}
            </p>

            {/* Pull Quote Callout */}
            {pullQuote && <PullQuote text={pullQuote} color={color} />}
          </React.Fragment>
        );
      })}

      {/* Remaining highlighted facts as a callout grid at the end */}
      {highlightedFacts && highlightedFacts.length > 2 && (
        <div style={{ 
          marginTop: 'var(--spacing-xl)', 
          padding: 'var(--spacing-md)',
          background: 'var(--bg-secondary)',
          borderTop: `3px solid ${color}`,
          borderRadius: '8px',
        }}>
          <h4 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color,
            margin: '0 0 16px 0'
          }}>
            KEY TAKEAWAYS
          </h4>
          <div className="ir-takeaways-grid">
            {highlightedFacts.slice(2).map((fact, idx) => (
              <div key={idx} style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderLeft: `3px solid ${color}`,
                borderRadius: '8px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--color-ink-secondary)',
                  margin: 0,
                  fontWeight: 500,
                }}>
                  {fact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page skeletons ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <Layout showNav={true}>
      <div className="ir-article-grid" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px var(--container-padding)' }}>
        <div>
          <div style={{ width: 120, height: 18, background: 'var(--bg-tertiary)', marginBottom: 16, borderRadius: 4 }} />
          <div style={{ width: '90%', height: 38, background: 'var(--bg-tertiary)', marginBottom: 24, borderRadius: 4 }} />
          <div style={{ width: '100%', height: 420, background: 'var(--bg-tertiary)', marginBottom: 28, borderRadius: 4 }} />
          <div style={{ width: '100%', height: 200, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
        </div>
        <div>
          <div style={{ width: '100%', height: 200, background: 'var(--bg-tertiary)', marginBottom: 20, borderRadius: 4 }} />
        </div>
      </div>
    </Layout>
  );
}

// ─── Article Detail Page ──────────────────────────────────────────────────────

interface ArticleClientProps {
  initialArticle?: Article | null;
  initialRelated?: Article[];
  initialMoreStories?: Article[];
  articleId?: string;
}

export default function ArticleClient({
  initialArticle = null,
  initialRelated = [],
  initialMoreStories = [],
  articleId,
}: ArticleClientProps) {
  const params = useParams();
  const router = useRouter();
  const id = articleId || (params?.id as string);

  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [related, setRelated] = useState<Article[]>(initialRelated);
  const [moreStories, setMoreStories] = useState<Article[]>(initialMoreStories);
  const [loading, setLoading] = useState(!initialArticle);
  const [relatedLoading, setRelatedLoading] = useState(
    !(initialRelated && initialRelated.length > 0)
  );
  const [moreStoriesLoading, setMoreStoriesLoading] = useState(
    !(initialMoreStories && initialMoreStories.length > 0)
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Reaction State
  const [reactions, setReactions] = useState<Record<string, number>>({
    like: 24, love: 15, laugh: 4, wow: 9, sad: 1, angry: 0
  });
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const primaryCategory = article?.categories?.[0];

  const handleReactionClick = (key: string) => {
    if (selectedReaction === key) {
      setReactions(prev => ({ ...prev, [key]: prev[key] - 1 }));
      setSelectedReaction(null);
    } else {
      setReactions(prev => {
        const next = { ...prev };
        if (selectedReaction) next[selectedReaction] = next[selectedReaction] - 1;
        next[key] = next[key] + 1;
        return next;
      });
      setSelectedReaction(key);
    }
  };

  useEffect(() => {
    if (!id) return;
    let active = true;

    recordArticleView(id);

    if (initialArticle?.id === id && initialRelated && initialRelated.length > 0 && initialMoreStories && initialMoreStories.length > 0) {
      setArticle(initialArticle);
      setRelated(initialRelated);
      setMoreStories(initialMoreStories);
      setRelatedLoading(false);
      setMoreStoriesLoading(false);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(false);
    setRelatedLoading(true);
    setMoreStoriesLoading(true);

    fetchArticleById(id).then(async (art) => {
      if (!active) return;
      setArticle(art);

      if (art) {
        const primaryCategory = art.categories?.[0];
        const searchQuery = art.keyword || art.headline;

        // Fetch category stories (runs concurrently, very fast)
        const categoryPromise = primaryCategory 
          ? fetchNews(primaryCategory) 
          : Promise.resolve([]);

        // Handle category stories load immediately (instant display)
        categoryPromise.then((categoryArticles) => {
          if (!active) return;
          const filtered = categoryArticles.filter(a => a.id !== id);
          setMoreStories(filtered.slice(0, 8));
          setMoreStoriesLoading(false);
        });

        // Fetch related search stories (slower due to Gemini API call)
        const searchPromise = fetchNews(undefined, searchQuery);

        // Wait for both search and category promises to compile final sidebar related stories (including fallback)
        Promise.all([searchPromise, categoryPromise]).then(([relatedSearch, categoryArticles]) => {
          if (!active) return;

          // 1. Sidebar: Related Stories
          let relatedArticles = relatedSearch.filter(a => a.id !== id);
          
          // Fallback to category articles if less than 5 related articles found
          if (relatedArticles.length < 5) {
            const fill = categoryArticles.filter(
              a => a.id !== id && !relatedArticles.some(r => r.id === a.id)
            );
            relatedArticles = [...relatedArticles, ...fill];
          }
          const finalRelated = relatedArticles.slice(0, 5);
          setRelated(finalRelated);
          setRelatedLoading(false);
        });
      }
    });

    return () => { active = false; };
  }, [id, initialArticle, initialRelated, initialMoreStories]);

  // Poll for image/enrichment updates if article is pending
  useEffect(() => {
    if (!id || !article || article.enrichmentStatus !== 'pending') return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const latestArticle = await fetchArticleById(id);
        if (!active) return;
        if (latestArticle && latestArticle.enrichmentStatus !== 'pending') {
          setArticle(latestArticle);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Failed to poll article updates:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, article?.enrichmentStatus]);

  const handleShare = () => {
    setShareOpen(true);
  };

  const handlePrint = () => { if (typeof window !== 'undefined') window.print(); };

  const toggleAudio = () => {
    if ('speechSynthesis' in window && article) {
      if (audioPlaying) {
        window.speechSynthesis.cancel();
        setAudioPlaying(false);
      } else {
        const textToSpeak = `${article.headline}. Key takeaways: ${article.summary.join('. ')}. ${article.contentBlocks?.join('. ')}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setAudioPlaying(false);
        utterance.onerror = () => setAudioPlaying(false);
        setAudioPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  if (loading) return <PageSkeleton />;

  if (!article) {
    return (
      <Layout showNav={true} activeNav={primaryCategory || 'Home'}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12 }}>
          <p style={{ fontSize: 16, color: 'var(--color-ink-muted)', fontWeight: 600 }}>Article not found</p>
          <button onClick={() => router.push('/')}
            className="ir-btn-primary"
            style={{ padding: '8px 20px', fontSize: 13 }}>
            Back to Home
          </button>
        </div>
      </Layout>
    );
  }

  const categoryColorHex = catColor(primaryCategory);
  const readTime = Math.ceil(((article.contentBlocks?.join(' ') || '').split(' ').length) / 200);

  return (
    <Layout showNav={true} activeNav={primaryCategory || 'Home'}>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--spacing-lg) var(--container-padding)' }}>
        {/* Breadcrumb / Category Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Link
            href="/"
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: categoryColorHex,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
          <span style={{ fontSize: 11, color: 'var(--color-ink-ghost)' }}>/</span>
          {primaryCategory ? (
            <Link
              href={categoryPath(primaryCategory)}
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: categoryColorHex,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {primaryCategory}
            </Link>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 800, color: categoryColorHex, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              News
            </span>
          )}
        </div>

        {/* Top Ad banner */}
        <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT} adFormat="horizontal" />

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--fs-hero)',
          fontWeight: 800,
          lineHeight: 1.15,
          color: 'var(--color-ink)',
          marginBottom: 'var(--spacing-md)',
          letterSpacing: '-0.02em',
          maxWidth: '95%'
        }}>
          {article.headline}
        </h1>

        {/* Divider line in category color */}
        <div style={{ width: 60, height: 4, background: categoryColorHex, marginBottom: 20, borderRadius: '2px' }} />

        {/* Premium Meta Row */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', 
          borderBottom: '1px solid var(--border-primary)', marginBottom: 'var(--spacing-lg)'
        }}>
          {/* Author/Date Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ color: 'var(--bg-primary)', fontSize: 13, fontWeight: 900, fontFamily: 'Georgia, serif' }}>DNI</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>Daily News Insights Editorial Desk</div>
              <div style={{ fontSize: 10, color: 'var(--color-ink-muted)', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 10, height: 10 }} />
                <span>{formatDate(article.createdAt)}</span>
                <span>·</span>
                <span>{readTime} MIN READ</span>
              </div>
            </div>
          </div>

          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
            <button className="action-pill" onClick={toggleAudio}>
              <Volume2 style={{ width: 14, height: 14 }} />
              <span>{audioPlaying ? 'STOP' : 'LISTEN'}</span>
            </button>
            <button className="action-pill">
              <Bookmark style={{ width: 14, height: 14 }} />
              <span>SAVE</span>
            </button>
            <button className="action-pill">
              <Printer style={{ width: 14, height: 14 }} />
              <span>PRINT</span>
            </button>
            <button className="action-pill active-pill" onClick={handleShare}>
              <Share2 style={{ width: 14, height: 14 }} />
              <span>SHARE</span>
            </button>
          </div>
        </div>

        {/* ── Page Grid ───────────────────────────────────────────────────────── */}
        <div className="ir-article-grid">
          
          {/* Left Main Content */}
          <div style={{ minWidth: 0 }}>
            {/* Hero Image */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              {article.imageUrl ? (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16 / 9', maxHeight: 520 }}>
                  <Image
                    src={optimizeImageUrl(article.imageUrl, 800)}
                    alt={article.headline}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 800px"
                    unoptimized
                    style={{ objectFit: 'cover' }}
                  />
                  <ImageSourceBadge imageUrl={article.imageUrl} />
                </div>
              ) : (
                <div 
                  className={article.enrichmentStatus === 'pending' ? 'skeleton-pulse' : ''}
                  style={{
                    width: '100%', height: 380,
                    background: article.enrichmentStatus === 'pending' ? 'var(--bg-tertiary)' : `linear-gradient(135deg, ${categoryColorHex}0d 0%, ${categoryColorHex}1a 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px'
                  }}
                >
                  {article.enrichmentStatus === 'pending' ? (
                    <span style={{ color: 'var(--color-ink-faint)', fontSize: 16, fontWeight: 600, opacity: 0.7 }}>Loading Editorial Image...</span>
                  ) : (
                    <span style={{ color: categoryColorHex, fontSize: 72, fontWeight: 900, fontFamily: 'var(--font-serif)', opacity: 0.15 }}>DNI</span>
                  )}
                </div>
              )}
              <div style={{ 
                textAlign: 'right', fontSize: 10, color: 'var(--color-ink-muted)', 
                marginTop: 6, fontStyle: 'italic', letterSpacing: '0.04em' 
              }}>
                IMAGE: DAILY NEWS INSIGHTS / NEWS DATA LABS
              </div>
            </div>

            {/* Summary Box (IR Summary Style) */}
            {article.summary && article.summary.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderLeft: `4px solid ${categoryColorHex}`,
                padding: 'var(--spacing-lg) var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)',
                borderRadius: '8px',
              }}>
                <h4 style={{ 
                  fontSize: 'var(--fs-sm)', fontWeight: 900, letterSpacing: '0.15em',
                  textTransform: 'uppercase', margin: '0 0 14px 0', color: categoryColorHex 
                }}>
                  DNI SUMMARY — KEY POINTS
                </h4>
                <ul style={{ 
                  margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--fs-md)', lineHeight: 1.65, color: 'var(--color-ink-secondary)'
                }}>
                  {article.summary.map((bullet, idx) => (
                    <li key={idx} style={{ paddingLeft: 4 }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content Header */}
            <div className="ir-content-header">
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-sm)', fontWeight: 900,
                color: categoryColorHex, letterSpacing: '0.15em', textTransform: 'uppercase'
              }}>
                IN-DEPTH ANALYSIS
              </span>
              <div className="ir-content-header-divider" />
              <div className="ir-content-header-tags">
                {article.categories?.map((cat, i) => (
                  <span key={i} style={{
                    fontSize: 9, fontWeight: 800, color: catColor(cat),
                    background: `${catColor(cat)}15`, padding: '3px 8px',
                    letterSpacing: '0.08em', textTransform: 'uppercase'
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Article Body */}
            <ArticleBody 
              contentBlocks={article.contentBlocks}
              sectionHeadings={article.sectionHeadings}
              highlightedFacts={article.highlightedFacts}
              color={categoryColorHex}
            />

            {/* Reactions Block */}
            <div style={{ 
              marginTop: 'var(--spacing-xxl)', paddingTop: 'var(--spacing-md)', borderTop: '2px solid var(--border-primary)',
              textAlign: 'center'
            }}>
              <span style={{ 
                fontSize: 11, fontWeight: 800, color: 'var(--color-ink-secondary)', letterSpacing: '0.1em',
                textTransform: 'uppercase', display: 'block', marginBottom: 'var(--spacing-md)'
              }}>
                How do you feel about this story?
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                {[
                  { key: 'like', emoji: '👍', label: 'Like' },
                  { key: 'love', emoji: '❤️', label: 'Love' },
                  { key: 'laugh', emoji: '😂', label: 'Laugh' },
                  { key: 'wow', emoji: '😮', label: 'Wow' },
                  { key: 'sad', emoji: '😢', label: 'Sad' },
                  { key: 'angry', emoji: '😡', label: 'Angry' },
                ].map((item) => {
                  const isActive = selectedReaction === item.key;
                  return (
                    <button 
                      key={item.key} 
                      onClick={() => handleReactionClick(item.key)}
                      className={`reaction-btn ${isActive ? 'reaction-active' : ''}`}
                    >
                      <span style={{ fontSize: 18 }}>{item.emoji}</span>
                      <span className="count">{reactions[item.key]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside>
            {/* Sentiment Tag */}
            {article.sentiment && (
              <div style={{
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: article.sentiment === 'Positive' ? 'rgba(22, 163, 74, 0.1)' : article.sentiment === 'Negative' ? 'rgba(225, 29, 72, 0.1)' : 'var(--bg-secondary)',
                border: `1px solid ${article.sentiment === 'Positive' ? 'rgba(22, 163, 74, 0.2)' : article.sentiment === 'Negative' ? 'rgba(225, 29, 72, 0.2)' : 'var(--border-primary)'}`,
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <TrendingUp style={{ 
                  width: 16, height: 16, 
                  color: article.sentiment === 'Positive' ? '#16a34a' : article.sentiment === 'Negative' ? '#e11d48' : '#64748b'
                }} />
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 2 }}>
                    SENTIMENT ANALYSIS
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                    {article.sentiment} Coverage
                  </div>
                </div>
              </div>
            )}

            {/* Related News List */}
            {!relatedLoading && related.length > 0 && (
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                  paddingBottom: 10, borderBottom: `2.5px solid ${categoryColorHex}` 
                }}>
                  <h3 style={{ 
                    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 900,
                    color: 'var(--color-ink)', letterSpacing: '0.12em', margin: 0, textTransform: 'uppercase'
                  }}>
                    Related Stories
                  </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {related.map(a => <SideCard key={a.id} article={a} />)}
                </div>
              </div>
            )}

            {/* Back to Home Button */}
            <button 
              onClick={() => router.push('/')}
              style={{
                width: '100%', marginTop: 20, marginBottom: 'var(--spacing-lg)', padding: '12px',
                background: categoryColorHex, color: '#fff', border: 'none',
                fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', cursor: 'pointer',
                transition: 'opacity 0.2s', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderRadius: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ◀ BACK TO HOME
            </button>

            {/* AI assisted notice */}
            <div style={{ background: 'var(--bg-secondary)', padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <AlertCircle style={{ width: 14, height: 14, color: categoryColorHex }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-ink)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Editorial Note & Quality Control
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--color-ink-muted)', lineHeight: 1.6, margin: 0 }}>
                Editorial Note: This briefing is programmatically compiled from verified media feeds and formally reviewed, verified, and authorized by the Daily News Insights editorial desk to maintain strict factual and contextual integrity.
              </p>
            </div>
            
            {/* Sidebar Ad banner */}
            <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT} adFormat="vertical" />
          </aside>
        </div>

        {/* More Stories Grid Section */}
        {!moreStoriesLoading && moreStories.length > 0 && (
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 18, background: 'var(--ir-crimson)', borderRadius: 2 }} />
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 900,
                color: 'var(--color-ink)',
                margin: 0
              }}>
                More Stories
              </h3>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
              gap: 24 
            }}>
              {moreStories.map((story) => (
                <MoreStoriesCard key={story.id} article={story} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={article.headline}
      />
    </Layout>
  );
}
