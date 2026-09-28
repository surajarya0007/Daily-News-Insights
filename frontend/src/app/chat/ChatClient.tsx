'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Loader2, MessageSquare, Search, Sun, Moon, Send, Sparkles } from 'lucide-react';
import { chatWithRag, type RagSearchResult } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: RagSearchResult[];
  suggestions?: string[];
}

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ask me about anything covered by Daily News Insights and I will answer using our internal articles only.',
};

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  const loadingSteps = [
    'Thinking...',
    'Searching article database...',
    'Synthesizing grounded answer...',
    'Finalizing response...'
  ];
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [loadingStatusText, setLoadingStatusText] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStepIdx(0);
      setLoadingStatusText(null);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIdx((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;

    // Check status immediately and then poll every 1.5s
    const checkStatus = () => {
      import('../../lib/api').then(({ fetchIngestStatus }) => {
        fetchIngestStatus({ useRagApi: true }).then((res) => {
          if (res && (res.status === 'processing' || res.status === 'scraping')) {
            if (res.status === 'scraping') {
              setLoadingStatusText(`Updating database for "${res.query || 'topic'}"...`);
            } else {
              setLoadingStatusText(`Crawling articles and synthesizing new story...`);
            }
          } else {
            setLoadingStatusText(null);
          }
        }).catch(() => {
          setLoadingStatusText(null);
        });
      });
    };

    checkStatus();
    const pollInterval = setInterval(checkStatus, 1500);
    return () => clearInterval(pollInterval);
  }, [loading]);

  const isChatStarted = useMemo(
    () => messages.some((m) => m.role === 'user'),
    [messages]
  );

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  useEffect(() => {
    if (isChatStarted) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isChatStarted]);

  const submitQuery = async (text?: string) => {
    const prompt = (text ?? query).trim();
    if (!prompt || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await chatWithRag({
        query: prompt,
        history: history.filter(h => h.content !== initialMessage.content),
        limit: 6,
      });

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: response?.answer || 'I could not generate an answer right now.',
        suggestions: response?.suggestions || [],
        sources: response?.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-assistant-error`,
        role: 'assistant',
        content: 'An error occurred while fetching the answer. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'What is the latest in India tech news?',
    'Summarize the most important health stories this week.',
    'Find articles about elections and policy changes.',
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--bg-primary)',
      color: 'var(--color-ink)',
      overflow: 'hidden',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .chat-input-container {
            padding: 6px 8px 6px 12px !important;
          }
          .chat-welcome-title {
            font-size: 26px !important;
          }
          .chat-welcome-desc {
            font-size: 13px !important;
          }
          .chat-scroll-area {
            padding: 16px 12px 140px !important;
          }
          .chat-input-dock {
            padding: 16px 16px 24px !important;
          }
          .suggestion-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .user-message-bubble {
            max-width: 85% !important;
          }
          .chat-back-text {
            display: none !important;
          }
          .chat-logo-text {
            display: none !important;
          }
          .chat-logo-badge {
            font-size: 9px !important;
            padding: 1px 4px !important;
            margin-left: 2px !important;
          }
          .chat-header {
            padding: 0 12px !important;
          }
        }
      `}</style>
      {/* Custom Minimal Header */}
      <header className="chat-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '56px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-primary)',
        zIndex: 10,
        position: 'relative',
      }}>
        <div>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
          }} className="hover-opacity">
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span className="chat-back-text">Home</span>
          </Link>
        </div>

        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {/* Logo Blocks */}
          <div style={{ display: 'flex', alignItems: 'center', height: 'var(--logo-box-size)' }}>
            <img 
              src="/logo.png" 
              alt="Daily News Insights Logo" 
              className="theme-logo-light"
              style={{ height: '100%', width: 'auto', display: 'block' }} 
            />
            <img 
              src="/logo-dark.png" 
              alt="Daily News Insights Logo" 
              className="theme-logo-dark"
              style={{ height: '100%', width: 'auto', display: 'block' }} 
            />
          </div>
          <span className="chat-logo-badge" style={{
            fontSize: 10,
            fontWeight: 700,
            background: 'var(--ir-crimson)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Chat
          </span>
        </div>

        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            padding: 8,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="theme-toggle-btn"
          title="Toggle Theme"
        >
          {!mounted ? <div style={{ width: 18, height: 18 }} /> : isDark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
        </button>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {!isChatStarted ? (
          /* INITIAL LANDING STATE (Input Bar at the Center/Top area) */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 24px 80px',
            maxWidth: '720px',
            width: '100%',
            margin: '0 auto',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--ir-crimson-bg)',
                color: 'var(--ir-crimson)',
                marginBottom: 16,
              }}>
                <Sparkles style={{ width: 28, height: 28 }} />
              </div>
              <h1 className="chat-welcome-title" style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 900,
                fontFamily: 'var(--font-serif)',
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
              }}>
                What's on the agenda today?
              </h1>
              <p className="chat-welcome-desc" style={{
                margin: '12px 0 0',
                fontSize: 14,
                color: 'var(--color-ink-muted)',
                lineHeight: 1.6,
                maxWidth: '540px',
              }}>
                {initialMessage.content}
              </p>
            </div>

            {/* Input Bar Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitQuery();
              }}
              style={{
                width: '100%',
                marginBottom: 32,
              }}
            >
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 24,
                padding: '8px 12px 8px 18px',
                boxShadow: 'var(--shadow-md)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }} className="chat-input-container">
                <Search style={{ width: 18, height: 18, color: 'var(--color-ink-muted)', marginRight: 12, flexShrink: 0 }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything covered by Daily News Insights..."
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 15,
                    color: 'var(--color-ink)',
                    padding: '8px 0',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  style={{
                    background: query.trim() && !loading ? 'var(--ir-crimson)' : 'var(--border-primary)',
                    color: query.trim() && !loading ? '#fff' : 'var(--color-ink-faint)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: query.trim() && !loading ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Send style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </form>

            {/* Suggestion Pills */}
            <div style={{ width: '100%' }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-ink-muted)',
                marginBottom: 12,
                textAlign: 'left',
              }}>
                Suggested Topics
              </div>
              <div className="suggestion-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                width: '100%',
              }}>
                {samplePrompts.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => void submitQuery(sample)}
                    style={{
                      textAlign: 'left',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 12,
                      background: 'var(--bg-secondary)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      color: 'var(--color-ink)',
                      fontSize: 13,
                      lineHeight: 1.5,
                      transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                    }}
                    className="suggestion-card"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT STATE (Scrollable Messages + Bottom Input Bar) */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
          }}>
            {/* Messages Scroll Area */}
            <div className="chat-scroll-area" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 24px 120px',
            }}>
              <div style={{
                maxWidth: '720px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 32,
              }}>
                {messages.map((message) => {
                  // Skip displaying the welcome message in active bubble history to keep it extremely clean
                  if (message.id === 'welcome') return null;

                  const isUser = message.role === 'user';
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        width: '100%',
                        animation: 'fadeIn 0.2s ease-out',
                      }}
                    >
                      {/* Message Content Container */}
                      <div
                        className="user-message-bubble"
                        style={{
                          maxWidth: isUser ? '75%' : '100%',
                          borderRadius: isUser ? '20px 20px 4px 20px' : '0',
                          padding: isUser ? '12px 18px' : '0 0 8px 0',
                          background: isUser ? 'var(--ir-crimson)' : 'none',
                          color: isUser ? '#fff' : 'var(--color-ink)',
                          border: 'none',
                          boxShadow: 'none',
                        }}
                      >
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.7,
                          fontSize: 16,
                          fontWeight: isUser ? 500 : 400,
                          fontFamily: isUser ? 'inherit' : 'var(--font-sans)',
                        }}>
                          {message.content}
                        </div>
                      </div>

                      {/* Suggestions in-flow */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => void submitQuery(suggestion)}
                              style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 20,
                                padding: '8px 14px',
                                fontSize: 13,
                                color: 'var(--color-ink)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              className="suggestion-pill-btn"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Source Cards */}
                      {message.sources && message.sources.length > 0 && (
                        <div style={{
                          marginTop: 16,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 12,
                          width: '100%',
                          maxWidth: '720px',
                        }}>
                          {message.sources.slice(0, 3).map((source) => (
                            <a
                              key={`${message.id}-${source.articleId}-${source.chunkType}-${source.chunkPosition}`}
                              href={source.articleUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                textDecoration: 'none',
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 12,
                                padding: '12px 14px',
                                color: 'var(--color-ink)',
                                transition: 'all 0.2s ease',
                              }}
                              className="source-card"
                            >
                              <div style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--color-ink)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {source.headline}
                                </span>
                                <ArrowUpRight style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--color-ink-muted)' }} />
                              </div>
                              <div style={{
                                fontSize: 11,
                                color: 'var(--color-ink-muted)',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}>
                                {source.chunkContent}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                 {loading && (
                  <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderRadius: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                    <span style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{loadingStatusText || loadingSteps[loadingStepIdx]}</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Bottom Docked Input Form */}
            <div className="chat-input-dock" style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(180deg, transparent 0%, var(--bg-primary) 30%)',
              padding: '24px 24px 32px',
              zIndex: 5,
            }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitQuery();
                }}
                style={{
                  maxWidth: '720px',
                  width: '100%',
                  margin: '0 auto',
                }}
              >
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 24,
                  padding: '8px 12px 8px 18px',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }} className="chat-input-container">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask another question..."
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: 15,
                      color: 'var(--color-ink)',
                      padding: '8px 0',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    style={{
                      background: query.trim() && !loading ? 'var(--ir-crimson)' : 'var(--border-primary)',
                      color: query.trim() && !loading ? '#fff' : 'var(--color-ink-faint)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: query.trim() && !loading ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Send style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: 'var(--color-ink-faint)',
                  marginTop: 10,
                }}>
                  Daily News Insights Chat can make mistakes. Verify important details.
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Styled JSX for local micro-animations and CSS overrides */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .theme-toggle-btn:hover {
          background-color: var(--bg-secondary) !important;
        }
        .hover-opacity:hover {
          opacity: 0.8;
        }
        .chat-input-container:focus-within {
          border-color: var(--ir-crimson) !important;
          box-shadow: 0 0 0 2px var(--ir-crimson-bg), var(--shadow-md) !important;
        }
        .suggestion-card:hover {
          transform: translateY(-2px);
          border-color: var(--ir-crimson) !important;
          background-color: var(--bg-primary) !important;
        }
        .source-card:hover {
          border-color: var(--ir-crimson) !important;
          background-color: var(--bg-primary) !important;
          transform: translateY(-2px);
        }
        .pill-btn:hover {
          background-color: var(--bg-secondary) !important;
        }
        .suggestion-pill-btn:hover {
          background-color: var(--bg-primary) !important;
          border-color: var(--ir-crimson) !important;
          color: var(--ir-crimson) !important;
        }
      `}</style>
    </div>
  );
}
