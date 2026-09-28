'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Layout from '../../components/Layout';
import { fetchNews, Article } from '../../lib/api';
import { Clock, BookOpen, Printer } from 'lucide-react';
import ImageSourceBadge from '../../components/ImageSourceBadge';
import { optimizeImageUrl } from '../../lib/seo';

export default function EPaperPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateStr] = useState(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
  });

  useEffect(() => {
    fetchNews().then(data => {
      setArticles(data.slice(0, 20));
      setLoading(false);
    });
  }, []);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <Layout showNav={false}>
      {/* Newspaper Print-friendly Styling */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .ir-header, .ir-footer, .back-to-top, .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Control Bar (No Print) */}
      <div className="no-print" style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-secondary)',
        padding: 'var(--spacing-sm) var(--container-padding)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen style={{ width: 18, height: 18, color: 'var(--ir-crimson)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>Daily News Insights Autonomous E-Paper Edition</span>
        </div>
        <button
          onClick={handlePrint}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-ink)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Printer style={{ width: 14, height: 14 }} />
          Print / Save PDF
        </button>
      </div>

      {/* Main Newspaper Layout */}
      <div className="print-container" style={{
        maxWidth: 1100,
        margin: 'clamp(10px, 4vw, 40px) auto',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-secondary)',
        padding: 'var(--spacing-lg) var(--container-padding)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--color-ink)',
      }}>
        {/* Masthead */}
        <div style={{ textAlign: 'center', borderBottom: '6px double var(--color-ink)', paddingBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
            Autonomous AI News Dispatch
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(36px, 8vw, 76px)',
            fontWeight: 900,
            lineHeight: 1,
            margin: '0 0 10px 0',
            letterSpacing: '-0.03em',
          }}>
            DAILY NEWS INSIGHTS
          </h1>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid var(--color-ink)',
            borderBottom: '2px solid var(--color-ink)',
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'var(--font-sans)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            <span>No. 01 / Vol. 2026</span>
            <span>{dateStr}</span>
            <span>AI SYNTHESIZED EDITION</span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--ir-crimson)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--color-ink-faint)' }}>Composing E-Paper...</span>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-ink-muted)' }}>
            No stories compiled for this edition.
          </div>
        )}

        {/* Newspaper Column Grid */}
        {!loading && articles.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {/* Top Headline Section (Lead Story) */}
            {articles[0] && (
              <div style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 24, marginBottom: 24 }}>
                <div className="epaper-lead-grid">
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--ir-crimson)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {articles[0].categories?.[0] || 'TOP REPORT'}
                    </span>
                    <h2 style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 38,
                      fontWeight: 900,
                      lineHeight: 1.15,
                      marginTop: 8,
                      marginBottom: 12,
                    }}>
                      {articles[0].headline}
                    </h2>
                    <p style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: 'var(--color-ink-secondary)',
                      columnCount: 2,
                      columnGap: 24,
                    }}>
                      {articles[0].summary?.[0]} {articles[0].contentBlocks?.[0]}
                    </p>
                  </div>
                  <div>
                    {articles[0].imageUrl && (
                      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
                        <Image
                          src={optimizeImageUrl(articles[0].imageUrl, 400)}
                          alt="Lead image"
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          unoptimized
                          style={{ objectFit: 'cover', border: '1px solid var(--border-secondary)', filter: 'grayscale(1)' }}
                        />
                        <ImageSourceBadge imageUrl={articles[0].imageUrl} style={{ filter: 'grayscale(1)' }} />
                      </div>
                    )}
                    <p style={{ fontSize: 10, fontStyle: 'italic', marginTop: 6, color: 'var(--color-ink-muted)' }}>
                      Photo from ingest stream associated with reports.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-grid of other news articles */}
            <div className="epaper-sub-grid">
              {articles.slice(1).map((art) => (
                <div
                  key={art.id}
                >
                  <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {art.categories?.[0] || 'General'}
                  </span>
                  <h3 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 16,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    marginTop: 4,
                    marginBottom: 8,
                  }}>
                    {art.headline}
                  </h3>
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--color-ink-muted)',
                  }}>
                    {art.summary?.[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
