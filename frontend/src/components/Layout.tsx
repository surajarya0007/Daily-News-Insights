'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import DisclaimerModal from './DisclaimerModal';
import { Article, fetchNews, chatWithRag } from '../lib/api';
import { articlePath } from '../lib/seo';
import { Clock, MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showBreakingTicker?: boolean;
  breakingArticles?: Article[];
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  onSearch?: (query: string) => void;
  onIngest?: () => void;
  ingesting?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

// Breaking ticker component (extracted from page.tsx)
function BreakingTicker({ articles = [] }: { articles?: Article[] }) {
  const items = articles.length > 0
    ? [...articles, ...articles]
    : [
        { id: '', headline: 'Daily News Insights: AI-Powered News Platform — Updated On Demand' },
        { id: '', headline: 'Breaking coverage from India and the world, synthesized by Gemini 1.5 Flash' },
        { id: '', headline: 'Live pipeline: Firecrawl extraction • Supabase storage • Upstash caching' }
      ];

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
          {items.map((item, i) => (
            item.id ? (
              <Link
                key={i}
                href={articlePath('categories' in item && item.categories?.[0] ? item.categories[0] : 'news', item.headline)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: 13,
                  padding: '0 28px',
                  whiteSpace: 'nowrap',
                  gap: 10,
                  textDecoration: 'none',
                }}
                className="ticker-item-clickable"
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
                {item.headline}
              </Link>
            ) : (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#fff',
                  fontSize: 13,
                  padding: '0 28px',
                  whiteSpace: 'nowrap',
                  gap: 10,
                  cursor: 'default',
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'inline-block', flexShrink: 0 }} />
                {item.headline}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Layout({
  children,
  showNav = true,
  showBreakingTicker = true,
  breakingArticles = [],
  activeNav = 'Home',
  onNavChange,
  onSearch,
  onIngest,
  ingesting = false,
  searchQuery = '',
  onSearchQueryChange,
  hideHeader = false,
  hideFooter = false,
}: LayoutProps) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [tickerNews, setTickerNews] = useState<Article[]>(breakingArticles);

  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: 'Hi! Ask me anything about our articles.' }
  ]);
  const [chatQuery, setChatQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const loadingSteps = [
    'Thinking...',
    'Searching database...',
    'Synthesizing answer...',
    'Finalizing response...'
  ];
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [chatLoadingStatusText, setChatLoadingStatusText] = useState<string | null>(null);

  useEffect(() => {
    if (!chatLoading) {
      setLoadingStepIdx(0);
      setChatLoadingStatusText(null);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIdx((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => clearInterval(interval);
  }, [chatLoading]);

  useEffect(() => {
    if (!chatLoading) return;

    const checkStatus = () => {
      import('../lib/api').then(({ fetchIngestStatus }) => {
        fetchIngestStatus({ useRagApi: true }).then((res) => {
          if (res && (res.status === 'processing' || res.status === 'scraping')) {
            if (res.status === 'scraping') {
              setChatLoadingStatusText(`Updating database for "${res.query || 'topic'}"...`);
            } else {
              setChatLoadingStatusText(`Crawling and indexing fresh news...`);
            }
          } else {
            setChatLoadingStatusText(null);
          }
        }).catch(() => {
          setChatLoadingStatusText(null);
        });
      });
    };

    checkStatus();
    const pollInterval = setInterval(checkStatus, 1500);
    return () => clearInterval(pollInterval);
  }, [chatLoading]);

  // Auto scroll to bottom of mini-chat
  useEffect(() => {
    if (chatWidgetOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, chatWidgetOpen]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = chatQuery.trim();
    if (!prompt || chatLoading) return;

    setChatMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setChatQuery('');
    setChatLoading(true);

    try {
      const response = await chatWithRag({
        query: prompt,
        history: chatMessages.slice(1),
        limit: 4,
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response?.answer || 'I could not generate an answer.' }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (breakingArticles.length > 0) {
      setTickerNews(breakingArticles);
      return;
    }

    if (!showBreakingTicker) {
      return;
    }

    let cancelled = false;

    fetchNews()
      .then((all) => {
        if (!cancelled) {
          setTickerNews(all.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error('[Layout] Failed to fetch ticker news:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [breakingArticles, showBreakingTicker]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--color-ink)', fontFamily: 'var(--font-sans)' }}>
      {!hideHeader && (
        <Header
          activeNav={activeNav}
          onNavChange={onNavChange}
          onSearch={onSearch}
          onIngest={onIngest}
          ingesting={ingesting}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          showNav={showNav}
          onDisclaimerClick={() => setDisclaimerOpen(true)}
        />
      )}

      {showBreakingTicker && !hideHeader && <BreakingTicker articles={tickerNews} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {!hideFooter && <Footer onNavChange={onNavChange} onDisclaimerClick={() => setDisclaimerOpen(true)} />}

      <DisclaimerModal isOpen={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />

      {!hideHeader && !hideFooter && (
        <>
          {/* Floating Chat Button */}
          <button
            onClick={() => setChatWidgetOpen(!chatWidgetOpen)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--ir-crimson)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
            }}
            className="floating-chat-btn"
            title="Chat with Assistant"
          >
            {chatWidgetOpen ? <X style={{ width: 24, height: 24 }} /> : <MessageSquare style={{ width: 24, height: 24 }} />}
          </button>

          {/* Floating Chatbox Popup */}
          {chatWidgetOpen && (
            <div
              style={{
                position: 'fixed',
                bottom: '92px',
                right: '16px',
                width: 'calc(100% - 32px)',
                maxWidth: '380px',
                height: '500px',
                maxHeight: 'calc(100vh - 120px)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 9999,
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles style={{ width: 16, height: 16, color: 'var(--ir-crimson)' }} />
                  <span style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}>
                    Daily News Insights Assistant
                  </span>
                </div>
                <button
                  onClick={() => setChatWidgetOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-muted)', cursor: 'pointer', padding: 4 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Message List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: 'var(--bg-primary)',
              }}>
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '10px 14px',
                        background: isUser ? 'var(--ir-crimson)' : 'var(--bg-secondary)',
                        color: isUser ? '#fff' : 'var(--color-ink)',
                        border: isUser ? 'none' : '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)',
                        fontSize: '13px',
                        lineHeight: '1.55',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  );
                })}
                {chatLoading && (
                  <div style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    fontSize: '13px',
                    color: 'var(--color-ink-muted)',
                  }}>
                    <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                    <span>{chatLoadingStatusText || loadingSteps[loadingStepIdx]}</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input form */}
              <form
                onSubmit={handleSendChat}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border-primary)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Ask a question..."
                  style={{
                    flex: 1,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '20px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    color: 'var(--color-ink)',
                    outline: 'none',
                  }}
                  className="widget-input"
                />
                <button
                  type="submit"
                  disabled={!chatQuery.trim() || chatLoading}
                  style={{
                    background: chatQuery.trim() && !chatLoading ? 'var(--ir-crimson)' : 'var(--border-primary)',
                    color: chatQuery.trim() && !chatLoading ? '#fff' : 'var(--color-ink-faint)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: chatQuery.trim() && !chatLoading ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Send style={{ width: 14, height: 14 }} />
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Keyframe for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .floating-chat-btn:hover {
          transform: scale(1.05);
          background-color: var(--ir-crimson-dark) !important;
        }
        .widget-input:focus {
          border-color: var(--ir-crimson) !important;
        }
      `}</style>
    </div>
  );
}
