'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart2, Newspaper, Cpu, Database, Plus, Trash2, Edit3,
  RefreshCw, CheckCircle, AlertTriangle, X, Search, ChevronRight,
  ChevronLeft, ArrowLeft, Loader2, Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminStats,
  createArticle,
  updateArticle,
  deleteArticle,
  clearRedisCache,
  fetchRagStatus,
  triggerRagBackfill,
  fetchNews,
  triggerIngest,
  fetchIngestStatus,
  Article,
  IngestStatusResponse,
  RagStatusResponse
} from '../../lib/api';
import { articlePath } from '../../lib/seo';

type AdminTab = 'overview' | 'cms' | 'ingestion' | 'maintenance';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // CMS states
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [cmsSearch, setCmsSearch] = useState('');
  const [cmsPage, setCmsPage] = useState(1);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Ingestion states
  const [ingestStatus, setIngestStatus] = useState<IngestStatusResponse | null>(null);
  const [ingestMode, setIngestMode] = useState<'category' | 'keyword'>('category');
  const [ingestCategory, setIngestCategory] = useState('all');
  const [ingestKeyword, setIngestKeyword] = useState('');
  const [ingestRunning, setIngestRunning] = useState(false);
  const [ingestResultMsg, setIngestResultMsg] = useState('');

  // Maintenance states
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState('');
  const [ragStatus, setRagStatus] = useState<RagStatusResponse | null>(null);
  const [ragRefreshing, setRagRefreshing] = useState(false);
  const [ragBackfillRunning, setRagBackfillRunning] = useState(false);
  const [ragMsg, setRagMsg] = useState('');

  // 1. Authorization Gate
  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Fetch admin stats
  const loadStats = useCallback(async () => {
    if (!user?.email) return;
    setStatsLoading(true);
    const data = await fetchAdminStats(user.email);
    if (data) {
      setStats(data);
    }
    setStatsLoading(false);
  }, [user?.email]);

  // Fetch articles for CMS
  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    const data = await fetchNews(undefined, cmsSearch || undefined);
    setArticles(data || []);
    setArticlesLoading(false);
  }, [cmsSearch]);

  // Ingestion status polling
  const loadIngestStatus = useCallback(async () => {
    const status = await fetchIngestStatus();
    setIngestStatus(status);
    if (status.status === 'processing' || status.status === 'scraping') {
      setIngestRunning(true);
    } else {
      setIngestRunning(false);
    }
  }, []);

  const loadRagStatus = useCallback(async () => {
    if (!user?.email) return;
    setRagRefreshing(true);
    const status = await fetchRagStatus(user.email);
    if (status) {
      setRagStatus(status);
    }
    setRagRefreshing(false);
  }, [user?.email]);

  useEffect(() => {
    if (!isLoggedIn) {
      // Don't redirect immediately to allow mounting and state checking
      return;
    }
    if (isAdmin) {
      loadStats();
      loadArticles();
      loadIngestStatus();
      loadRagStatus();
    }
  }, [isLoggedIn, isAdmin, loadStats, loadArticles, loadIngestStatus, loadRagStatus]);

  // Periodic polling for ingestion status if running
  useEffect(() => {
    let interval: any;
    if (ingestRunning) {
      interval = setInterval(() => {
        loadIngestStatus();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [ingestRunning, loadIngestStatus]);

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 36, maxWidth: 450, boxShadow: 'var(--shadow-lg)' }}>
          <Key style={{ width: 48, height: 48, color: 'var(--ir-crimson)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)', marginBottom: 12 }}>Authentication Required</h2>
          <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            Please log in first. If you are an administrator, you will be automatically redirected to the management panel.
          </p>
          <button
            onClick={() => router.push('/')}
            className="ir-btn-primary"
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 36, maxWidth: 450, boxShadow: 'var(--shadow-lg)' }}>
          <AlertTriangle style={{ width: 48, height: 48, color: 'var(--ir-crimson)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)', marginBottom: 12 }}>Access Denied (403)</h2>
          <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            Your account ({user?.email}) does not have administrator privileges. Only selected administrative accounts can view this dashboard.
          </p>
          <button
            onClick={() => router.push('/')}
            className="ir-btn-primary"
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Handle Delete Article
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this article? This action cannot be undone.')) {
      return;
    }
    const success = await deleteArticle(id, user!.email);
    if (success) {
      setArticles(prev => prev.filter(a => a.id !== id));
      loadStats();
    } else {
      alert('Failed to delete article. Please try again.');
    }
  };

  // Handle manual Ingest trigger
  const handleIngestTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ingestRunning) return;

    setIngestRunning(true);
    setIngestResultMsg('Triggering ingestion pipeline...');

    const categoryParam = ingestMode === 'category' && ingestCategory !== 'all' ? ingestCategory : undefined;
    const keywordParam = ingestMode === 'keyword' ? ingestKeyword : undefined;

    // Trigger ingest asynchronously
    void triggerIngest(categoryParam, undefined, keywordParam, (status) => {
      setIngestStatus(status);
    }).then(result => {
      setIngestRunning(false);
      if (result.success) {
        setIngestResultMsg(`Ingestion success: ${result.ingestedCount} created, ${result.skippedCount} skipped, ${result.errorsCount} errors.`);
        loadStats();
        loadArticles();
      } else {
        setIngestResultMsg(`Ingestion failed: ${result.message}`);
      }
    });
  };

  // Handle Cache Clear
  const handleClearCache = async () => {
    setCacheClearing(true);
    setCacheMsg('Flushing cache...');
    const success = await clearRedisCache(user!.email);
    setCacheClearing(false);
    if (success) {
      setCacheMsg('Redis cache cleared successfully!');
    } else {
      setCacheMsg('Failed to clear cache.');
    }
    setTimeout(() => setCacheMsg(''), 3000);
  };

  const handleRagBackfill = async () => {
    if (!user?.email || ragBackfillRunning) return;
    setRagBackfillRunning(true);
    setRagMsg('Starting vector backfill...');
    const result = await triggerRagBackfill(user.email, 25);
    if (result) {
      setRagStatus(result);
      setRagMsg(result.running ? 'Vector backfill is running in the background.' : 'Vector backfill request processed.');
      await loadRagStatus();
      loadStats();
    } else {
      setRagMsg('Failed to start vector backfill.');
    }
    setRagBackfillRunning(false);
  };

  // Article Form Submit (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSaving(true);

    const formData = editingArticle || {};

    if (!formData.headline || !formData.keyword || !formData.sentiment || !formData.categories || formData.categories.length === 0) {
      setFormError('Please fill in all required fields (Headline, Keyword, Sentiment, and at least 1 Category).');
      setFormSaving(false);
      return;
    }

    // Ensure summaries, contentBlocks, sectionHeadings, highlightedFacts are arrays
    const formattedData = {
      ...formData,
      summary: Array.isArray(formData.summary)
        ? formData.summary.filter(Boolean)
        : [formData.summary || ''].filter(Boolean),
      contentBlocks: Array.isArray(formData.contentBlocks)
        ? formData.contentBlocks.filter(Boolean)
        : [formData.contentBlocks || ''].filter(Boolean),
      sectionHeadings: Array.isArray(formData.sectionHeadings)
        ? formData.sectionHeadings.filter(Boolean)
        : [formData.sectionHeadings || ''].filter(Boolean),
      highlightedFacts: Array.isArray(formData.highlightedFacts)
        ? formData.highlightedFacts.filter(Boolean)
        : [formData.highlightedFacts || ''].filter(Boolean),
    };

    if (formattedData.summary.length < 5) {
      setFormError('Manual articles require exactly 5 bullet point summaries.');
      setFormSaving(false);
      return;
    }

    if (formattedData.contentBlocks.length < 8) {
      setFormError('Manual articles require exactly 8 paragraphs of content blocks.');
      setFormSaving(false);
      return;
    }

    if (formattedData.sectionHeadings.length < 4) {
      setFormError('Manual articles require exactly 4 editorial section headings.');
      setFormSaving(false);
      return;
    }

    if (formattedData.highlightedFacts.length < 4) {
      setFormError('Manual articles require exactly 4 highlighted facts.');
      setFormSaving(false);
      return;
    }

    try {
      let savedArticle: Article | null = null;
      if (isCreatingNew) {
        savedArticle = await createArticle(formattedData, user!.email);
      } else if (formData.id) {
        savedArticle = await updateArticle(formData.id, formattedData, user!.email);
      }

      if (savedArticle) {
        // Refresh
        setEditingArticle(null);
        setIsCreatingNew(false);
        loadArticles();
        loadStats();
      } else {
        setFormError('Server failed to save the article. Please check input parameters.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving article.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleAddField = (field: 'summary' | 'contentBlocks' | 'sectionHeadings' | 'highlightedFacts', size: number) => {
    setEditingArticle(prev => {
      if (!prev) return null;
      const arr = [...((prev as any)[field] || [])];
      while (arr.length < size) arr.push('');
      return { ...prev, [field]: arr };
    });
  };

  const startEdit = (article: Article) => {
    // Make copies of arrays to prevent direct state mutations
    setEditingArticle({
      ...article,
      summary: [...(article.summary || [])],
      contentBlocks: [...(article.contentBlocks || [])],
      sectionHeadings: [...(article.sectionHeadings || [])],
      highlightedFacts: [...(article.highlightedFacts || [])],
    });
    setIsCreatingNew(false);
  };

  const startCreate = () => {
    setEditingArticle({
      headline: '',
      keyword: '',
      sentiment: 'Neutral',
      categories: ['India'],
      summary: Array(5).fill(''),
      contentBlocks: Array(8).fill(''),
      sectionHeadings: Array(4).fill(''),
      highlightedFacts: Array(4).fill(''),
      imageUrl: ''
    });
    setIsCreatingNew(true);
  };

  // Custom SVG Area Chart Helper
  const renderSVGChart = () => {
    if (!stats?.viewsOverTime || stats.viewsOverTime.length === 0) return null;
    
    const data = stats.viewsOverTime;
    const width = 600;
    const height = 180;
    const padding = 20;

    const counts = data.map((d: any) => d.count);
    const maxCount = Math.max(...counts, 5); // Avoid division by zero, min scale 5
    
    const points = data.map((d: any, idx: number) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (d.count / maxCount) * (height - padding * 2);
      return { x, y };
    });

    const linePath = points.map((p: any, idx: number) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: 200 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ir-crimson)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--ir-crimson)" stopOpacity="0.0"/>
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-secondary)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-faint)" strokeDasharray="4 4" strokeWidth="1" />
        <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="var(--border-faint)" strokeDasharray="4 4" strokeWidth="1" />

        {/* Areas & Lines */}
        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={linePath} fill="none" stroke="var(--ir-crimson)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data Points */}
        {points.map((p: any, idx: number) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-primary)" stroke="var(--ir-crimson)" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-sans)">
              {data[idx].count}
            </text>
            <text x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--color-ink-faint)" fontFamily="var(--font-sans)">
              {data[idx].date}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const lastRunTime = ingestStatus?.completedAt || ingestStatus?.startedAt;
  const lastRunLabel = ingestStatus?.completedAt
    ? 'Last run'
    : ingestStatus?.startedAt
      ? 'Last started'
      : 'Last run';
  const triggerButtonLabel = ingestMode === 'category' && ingestCategory === 'all'
    ? 'Trigger All Categories'
    : 'Trigger Ingestion';

  return (
    <div className="ir-container" style={{ padding: '36px var(--container-padding)', minHeight: '80vh' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--color-ink)', paddingBottom: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            System Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', marginTop: 4, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
            Daily News Insights Management Portal &bull; Logged in as: <strong style={{ color: 'var(--color-ink)' }}>{user?.displayName} (Admin)</strong>
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid var(--border-primary)', borderRadius: 24, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-ink)', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back to Portal
        </button>
      </div>

      {/* Grid Dashboard */}
      <div className="ir-home-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28 }}>
        
        {/* Navigation Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart2 style={{ width: 16, height: 16 }} /> },
            { id: 'cms', label: 'Dossier CMS', icon: <Newspaper style={{ width: 16, height: 16 }} /> },
            { id: 'ingestion', label: 'Ingestion Pipeline', icon: <Cpu style={{ width: 16, height: 16 }} /> },
            { id: 'maintenance', label: 'Cache & Maintenance', icon: <Database style={{ width: 16, height: 16 }} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                setEditingArticle(null);
                setIsCreatingNew(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '12px 16px', borderRadius: 8, border: 'none',
                textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                background: activeTab === tab.id ? 'var(--color-ink)' : 'transparent',
                color: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--color-ink-muted)',
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--color-ink)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-ink-muted)';
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Box */}
        <main style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border-primary)', borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-sm)' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 10, marginBottom: 20 }}>
                Platform Analytics
              </h2>

              {statsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Loader2 style={{ width: 36, height: 36, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  
                  {/* Stats Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    {[
                      { label: 'Total Dossiers', count: stats?.totalArticles ?? 0 },
                      { label: 'All-Time Views', count: stats?.totalViews ?? 0 },
                      { label: 'Views (24 Hours)', count: stats?.views24h ?? 0 },
                    ].map((card, i) => (
                      <div key={i} style={{ padding: 20, background: 'var(--bg-secondary)', border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)', marginTop: 8 }}>{card.count}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                    
                    {/* SVG Views over time */}
                    <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)', borderBottom: '1px dashed var(--border-primary)', paddingBottom: 8, marginBottom: 16 }}>
                        Views Trajectory (7 Days)
                      </h3>
                      {renderSVGChart()}
                    </div>

                    {/* Sentiment Distribution */}
                    <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)', borderBottom: '1px dashed var(--border-primary)', paddingBottom: 8, marginBottom: 16 }}>
                        Sentiment Breakdown
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                        {[
                          { key: 'Positive', label: 'Positive Tone', color: '#10b981' },
                          { key: 'Neutral', label: 'Neutral Tone', color: '#6b7280' },
                          { key: 'Negative', label: 'Negative Tone', color: 'var(--ir-crimson)' },
                        ].map(item => {
                          const val = stats?.sentimentBreakdown?.[item.key] || 0;
                          const total = (stats?.sentimentBreakdown?.Positive || 0) + (stats?.sentimentBreakdown?.Neutral || 0) + (stats?.sentimentBreakdown?.Negative || 0) || 1;
                          const pct = Math.round((val / total) * 100);
                          return (
                            <div key={item.key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                                <span style={{ color: 'var(--color-ink)' }}>{item.label}</span>
                                <span style={{ color: 'var(--color-ink-muted)' }}>{val} ({pct}%)</span>
                              </div>
                              <div style={{ width: '100%', height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Category Grid */}
                  <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)', borderBottom: '1px dashed var(--border-primary)', paddingBottom: 8, marginBottom: 16 }}>
                      Articles By Category
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                      {['India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'].map(cat => {
                        const count = stats?.categoryBreakdown?.[cat] || 0;
                        return (
                          <div key={cat} style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{cat}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--color-ink)', color: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 10 }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Articles list */}
                  <div style={{ border: '1.5px solid var(--border-primary)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '14px 20px', borderBottom: '1px solid var(--border-primary)' }}>
                      <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)' }}>
                        Top Viewed Articles (All-Time)
                      </h3>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      {stats?.topArticles && stats.topArticles.length > 0 ? (
                        stats.topArticles.map((art: any, idx: number) => (
                          <div key={art.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: idx < stats.topArticles.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                            <div style={{ flex: 1, paddingRight: 16 }}>
                              <a href={articlePath(art.categories?.[0] || 'news', art.headline)} target="_blank" style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-ink)', textDecoration: 'none' }} className="hover-line">
                                {art.headline}
                              </a>
                              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                {art.categories.map((c: string) => (
                                  <span key={c} style={{ fontSize: 9, fontWeight: 700, background: 'var(--border-secondary)', padding: '1px 5px', borderRadius: 4, color: 'var(--color-ink-muted)' }}>{c}</span>
                                ))}
                                <span style={{ fontSize: 9, fontWeight: 700, color: art.sentiment === 'Positive' ? '#10b981' : art.sentiment === 'Negative' ? 'var(--ir-crimson)' : 'var(--color-ink-muted)' }}>
                                  {art.sentiment}
                                </span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <strong style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-ink)' }}>{art.views}</strong>
                              <span style={{ display: 'block', fontSize: 9, color: 'var(--color-ink-faint)', textTransform: 'uppercase', fontWeight: 600 }}>Views</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--color-ink-faint)' }}>No views recorded yet.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOSSIER CMS */}
          {activeTab === 'cms' && (
            <div>
              {/* Form editing / creating view */}
              {editingArticle ? (
                <form onSubmit={handleFormSubmit}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: 10, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)' }}>
                      {isCreatingNew ? 'Create New Editorial Dossier' : 'Edit Dossier Details'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingArticle(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)', padding: 4 }}
                    >
                      <X style={{ width: 20, height: 20 }} />
                    </button>
                  </div>

                  {formError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'rgba(198, 40, 40, 0.08)', border: '1.5px solid var(--ir-crimson)', borderRadius: 6, color: 'var(--ir-crimson)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
                      <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Headline */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink)' }}>Headline (Required)</label>
                      <input
                        type="text"
                        value={editingArticle.headline || ''}
                        onChange={e => setEditingArticle(prev => ({ ...prev!, headline: e.target.value }))}
                        className="ir-input"
                        placeholder="e.g. Google Unveils DeepMind Cyber Security Inoculation System..."
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Keyword */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink)' }}>Keyword / Main Topic (Required)</label>
                        <input
                          type="text"
                          value={editingArticle.keyword || ''}
                          onChange={e => setEditingArticle(prev => ({ ...prev!, keyword: e.target.value }))}
                          className="ir-input"
                          placeholder="e.g. Google DeepMind cyber security"
                          disabled={!isCreatingNew}
                        />
                      </div>
                      
                      {/* Sentiment */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink)' }}>Sentiment (Required)</label>
                        <select
                          value={editingArticle.sentiment || 'Neutral'}
                          onChange={e => setEditingArticle(prev => ({ ...prev!, sentiment: e.target.value as any }))}
                          className="ir-input"
                          style={{ background: 'var(--bg-primary)', padding: '10px 12px' }}
                        >
                          <option value="Positive">Positive</option>
                          <option value="Negative">Negative</option>
                          <option value="Neutral">Neutral</option>
                        </select>
                      </div>
                    </div>

                    {/* Categories Checkboxes */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink)' }}>Categories (Required - Select at least one)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                        {['India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'].map(cat => {
                          const checked = editingArticle.categories?.includes(cat);
                          return (
                            <label key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-ink)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setEditingArticle(prev => {
                                    if (!prev) return null;
                                    const cats = prev.categories ? [...prev.categories] : [];
                                    if (cats.includes(cat)) {
                                      return { ...prev, categories: cats.filter(c => c !== cat) };
                                    } else {
                                      return { ...prev, categories: [...cats, cat] };
                                    }
                                  });
                                }}
                              />
                              {cat}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Image URL */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink)' }}>Cover Image URL (Optional)</label>
                      <input
                        type="text"
                        value={editingArticle.imageUrl || ''}
                        onChange={e => setEditingArticle(prev => ({ ...prev!, imageUrl: e.target.value }))}
                        className="ir-input"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>

                    {/* 5 Bullet Point Summaries */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Bullet Summaries (Exactly 5 fields, complete sentences)</label>
                        <button type="button" onClick={() => handleAddField('summary', 5)} className="hover-line" style={{ background: 'none', border: 'none', fontSize: 10, fontWeight: 800, color: 'var(--ir-crimson)', cursor: 'pointer' }}>Init Fields</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Array(5).fill(0).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={editingArticle.summary?.[idx] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingArticle(prev => {
                                if (!prev) return null;
                                const sum = prev.summary ? [...prev.summary] : [];
                                sum[idx] = val;
                                return { ...prev, summary: sum };
                              });
                            }}
                            className="ir-input"
                            placeholder={`Bullet Point #${idx + 1} (Minimum 20 words)`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Highlighted Facts (exactly 4) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Highlighted Pull-Quotes / Facts (Exactly 4 fields)</label>
                        <button type="button" onClick={() => handleAddField('highlightedFacts', 4)} className="hover-line" style={{ background: 'none', border: 'none', fontSize: 10, fontWeight: 800, color: 'var(--ir-crimson)', cursor: 'pointer' }}>Init Fields</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Array(4).fill(0).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={editingArticle.highlightedFacts?.[idx] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingArticle(prev => {
                                if (!prev) return null;
                                const facts = prev.highlightedFacts ? [...prev.highlightedFacts] : [];
                                facts[idx] = val;
                                return { ...prev, highlightedFacts: facts };
                              });
                            }}
                            className="ir-input"
                            placeholder={`Fact / Quote #${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Editorial Headings (exactly 4) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Editorial Section Headings (Exactly 4 fields - will render before paragraphs 2, 4, 6, and 8)</label>
                        <button type="button" onClick={() => handleAddField('sectionHeadings', 4)} className="hover-line" style={{ background: 'none', border: 'none', fontSize: 10, fontWeight: 800, color: 'var(--ir-crimson)', cursor: 'pointer' }}>Init Fields</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {Array(4).fill(0).map((_, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={editingArticle.sectionHeadings?.[idx] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingArticle(prev => {
                                if (!prev) return null;
                                const heads = prev.sectionHeadings ? [...prev.sectionHeadings] : [];
                                heads[idx] = val;
                                return { ...prev, sectionHeadings: heads };
                              });
                            }}
                            className="ir-input"
                            placeholder={`Heading ${idx + 1} (placed before Paragraph ${2 + idx * 2})`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Content Blocks (exactly 8 paragraphs) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Article Paragraphs (Exactly 8 paragraphs, minimum 80 words each)</label>
                        <button type="button" onClick={() => handleAddField('contentBlocks', 8)} className="hover-line" style={{ background: 'none', border: 'none', fontSize: 10, fontWeight: 800, color: 'var(--ir-crimson)', cursor: 'pointer' }}>Init Fields</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Array(8).fill(0).map((_, idx) => (
                          <div key={idx}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-ink-faint)', marginBottom: 2 }}>
                              Paragraph {idx + 1} {idx > 0 && `(preceded by Section Heading: "${editingArticle.sectionHeadings?.[idx - 1] || 'None'}")`}
                            </div>
                            <textarea
                              rows={3}
                              value={editingArticle.contentBlocks?.[idx] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setEditingArticle(prev => {
                                  if (!prev) return null;
                                  const blocks = prev.contentBlocks ? [...prev.contentBlocks] : [];
                                  blocks[idx] = val;
                                  return { ...prev, contentBlocks: blocks };
                                });
                              }}
                              className="ir-input"
                              style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
                              placeholder={`Write paragraph #${idx + 1} here... (Min 80 words. Use **bold** selectively)`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-primary)', marginTop: 24, paddingTop: 16, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setEditingArticle(null)}
                      className="ir-login-btn"
                      style={{ padding: '10px 20px', borderRadius: 6, fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="ir-btn-primary"
                      style={{ padding: '10px 24px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    >
                      {formSaving ? (
                        <>
                          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                          Saving...
                        </>
                      ) : (
                        'Save Dossier'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // CMS LIST TABLE
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: 16, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)', margin: 0 }}>
                      Dossier Management System
                    </h2>
                    
                    {/* Search & Actions */}
                    <div style={{ display: 'flex', gap: 12, width: '100%', flex: '1 1 auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: 220 }}>
                        <input
                          type="text"
                          value={cmsSearch}
                          onChange={e => {
                            setCmsSearch(e.target.value);
                            setCmsPage(1);
                          }}
                          placeholder="Search dossiers..."
                          className="ir-input"
                          style={{ padding: '8px 12px 8px 32px', fontSize: 12, borderRadius: 20 }}
                        />
                        <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
                      </div>

                      <button
                        onClick={startCreate}
                        className="ir-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, borderRadius: 20, width: 'auto', cursor: 'pointer' }}
                      >
                        <Plus style={{ width: 14, height: 14 }} />
                        Create Manual
                      </button>
                    </div>
                  </div>

                  {articlesLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                    </div>
                  ) : (
                    <div>
                      {articles.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 8 }}>
                          <Newspaper style={{ width: 40, height: 40, color: 'var(--color-ink-faint)', marginBottom: 12 }} />
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>No articles found</div>
                          <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 4 }}>Try adjusting your search criteria or create a manual dossier.</div>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--border-primary)', color: 'var(--color-ink)' }}>
                                <th style={{ padding: '10px 8px', fontWeight: 800 }}>Headline</th>
                                <th style={{ padding: '10px 8px', fontWeight: 800 }}>Keyword</th>
                                <th style={{ padding: '10px 8px', fontWeight: 800 }}>Category</th>
                                <th style={{ padding: '10px 8px', fontWeight: 800 }}>Sentiment</th>
                                <th style={{ padding: '10px 8px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {articles.slice((cmsPage - 1) * 10, cmsPage * 10).map(art => (
                                <tr key={art.id} style={{ borderBottom: '1px solid var(--border-secondary)', transition: 'background 0.2s' }}>
                                  <td style={{ padding: '12px 8px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <a href={articlePath(art.categories?.[0] || 'news', art.headline)} target="_blank" style={{ color: 'var(--color-ink)', fontWeight: 700, textDecoration: 'none' }} className="hover-line">
                                      {art.headline}
                                    </a>
                                  </td>
                                  <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--color-ink-muted)' }}>{art.keyword}</td>
                                  <td style={{ padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {art.categories.slice(0, 2).map(c => (
                                        <span key={c} style={{ fontSize: 10, background: 'var(--border-secondary)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: 'var(--color-ink)' }}>{c}</span>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 8px' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: art.sentiment === 'Positive' ? '#10b981' : art.sentiment === 'Negative' ? 'var(--ir-crimson)' : 'var(--color-ink-muted)' }}>
                                      {art.sentiment}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: 8 }}>
                                      <button
                                        onClick={() => startEdit(art)}
                                        style={{ background: 'none', border: '1px solid var(--border-primary)', padding: 6, borderRadius: 4, cursor: 'pointer', color: 'var(--color-ink)', display: 'flex', alignItems: 'center' }}
                                        title="Edit Article"
                                      >
                                        <Edit3 style={{ width: 13, height: 13 }} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(art.id)}
                                        style={{ background: 'none', border: '1px solid var(--ir-crimson)', padding: 6, borderRadius: 4, cursor: 'pointer', color: 'var(--ir-crimson)', display: 'flex', alignItems: 'center' }}
                                        title="Delete Article"
                                      >
                                        <Trash2 style={{ width: 13, height: 13 }} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Pagination controls */}
                          {articles.length > 10 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid var(--border-primary)', paddingTop: 16 }}>
                              <span style={{ fontSize: 11, color: 'var(--color-ink-muted)', fontWeight: 600 }}>
                                Showing {(cmsPage - 1) * 10 + 1}-{Math.min(cmsPage * 10, articles.length)} of {articles.length} dossiers
                              </span>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => setCmsPage(prev => Math.max(prev - 1, 1))}
                                  disabled={cmsPage === 1}
                                  style={{ background: 'none', border: '1px solid var(--border-primary)', padding: 6, borderRadius: 4, cursor: cmsPage === 1 ? 'not-allowed' : 'pointer', opacity: cmsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
                                >
                                  <ChevronLeft style={{ width: 15, height: 15 }} />
                                </button>
                                <button
                                  onClick={() => setCmsPage(prev => Math.min(prev + 1, Math.ceil(articles.length / 10)))}
                                  disabled={cmsPage >= Math.ceil(articles.length / 10)}
                                  style={{ background: 'none', border: '1px solid var(--border-primary)', padding: 6, borderRadius: 4, cursor: cmsPage >= Math.ceil(articles.length / 10) ? 'not-allowed' : 'pointer', opacity: cmsPage >= Math.ceil(articles.length / 10) ? 0.4 : 1, display: 'flex', alignItems: 'center' }}
                                >
                                  <ChevronRight style={{ width: 15, height: 15 }} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INGESTION PIPELINE */}
          {activeTab === 'ingestion' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 10, marginBottom: 20 }}>
                Autonomous Ingestion Pipeline
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Current pipeline status card */}
                <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-primary)', borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Cpu style={{ width: 20, height: 20, color: ingestRunning ? 'var(--ir-crimson)' : 'var(--color-ink-muted)' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)' }}>Pipeline State</span>
                    </div>
                    
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-primary)' }}>
                      {ingestRunning ? (
                        <>
                          <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite', color: 'var(--ir-crimson)' }} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ir-crimson)', textTransform: 'uppercase' }}>Ingesting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle style={{ width: 12, height: 12, color: '#10b981' }} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>Idle / Listening</span>
                        </>
                      )}
                    </div>
                  </div>

                      {ingestStatus && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--color-ink-muted)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                          <div>Status message: <strong style={{ color: 'var(--color-ink)' }}>{ingestStatus.message}</strong></div>
                      {lastRunTime && <div>{lastRunLabel}: <span style={{ color: 'var(--color-ink)' }}>{new Date(lastRunTime).toLocaleString('en-IN')}</span></div>}
                      {ingestStatus.startedAt && ingestStatus.completedAt && <div>Started: <span style={{ color: 'var(--color-ink)' }}>{new Date(ingestStatus.startedAt).toLocaleString('en-IN')}</span></div>}
                      {ingestStatus.completedAt && <div>Finished: <span style={{ color: 'var(--color-ink)' }}>{new Date(ingestStatus.completedAt).toLocaleString('en-IN')}</span></div>}
                      
                      {(ingestStatus.ingestedCount !== undefined || ingestStatus.skippedCount !== undefined) && (
                        <div style={{ display: 'flex', gap: 16, borderTop: '1px dashed var(--border-primary)', paddingTop: 10, marginTop: 4 }}>
                          <div>Ingested: <strong style={{ color: '#10b981' }}>{ingestStatus.ingestedCount}</strong></div>
                          <div>Skipped: <strong style={{ color: 'var(--color-ink)' }}>{ingestStatus.skippedCount}</strong></div>
                          <div>Errors: <strong style={{ color: 'var(--ir-crimson)' }}>{ingestStatus.errorsCount}</strong></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Trigger control box */}
                <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-ink)', borderBottom: '1px dashed var(--border-primary)', paddingBottom: 8, marginBottom: 16 }}>
                    Trigger Manual Execution
                  </h3>

                  <form onSubmit={handleIngestTrigger} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--color-ink)' }}>
                        <input
                          type="radio"
                          checked={ingestMode === 'category'}
                          onChange={() => setIngestMode('category')}
                        />
                        Ingest Category Feed
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--color-ink)' }}>
                        <input
                          type="radio"
                          checked={ingestMode === 'keyword'}
                          onChange={() => setIngestMode('keyword')}
                        />
                        Search Breaking Event
                      </label>
                    </div>

                    {ingestMode === 'category' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink-muted)' }}>RSS Section Feed</label>
                        <select
                          value={ingestCategory}
                          onChange={e => setIngestCategory(e.target.value)}
                          className="ir-input"
                          style={{ background: 'var(--bg-primary)', padding: '10px 12px' }}
                        >
                          <option value="all">All Categories</option>
                          {['Tech', 'Business', 'Science', 'Health', 'Entertainment', 'Sports', 'World', 'India', 'Finance', 'Politics'].map(cat => (
                            <option key={cat} value={cat}>{cat} RSS Feed</option>
                          ))}
                        </select>
                        <p style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 4 }}>
                          Extracts emerging trends from Google News category feeds, scrapes matching reports, and generates syntheses using Gemini. Choose All Categories to run the same broad ingestion pass used by the scheduler.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-ink-muted)' }}>Custom Topic / Event Query</label>
                        <input
                          type="text"
                          value={ingestKeyword}
                          onChange={e => setIngestKeyword(e.target.value)}
                          placeholder="e.g. RBI rate cuts impact home loan rates"
                          className="ir-input"
                        />
                        <p style={{ fontSize: 11, color: 'var(--color-ink-faint)', marginTop: 4 }}>
                          Provide a specific topic. The pipeline will search, scrape multiple online sources, and write a professional dossier.
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-secondary)', paddingTop: 16, marginTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                        {ingestResultMsg}
                      </span>
                      <button
                        type="submit"
                        disabled={ingestRunning || (ingestMode === 'keyword' && !ingestKeyword.trim())}
                        className="ir-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 20, width: 'auto', cursor: 'pointer' }}
                      >
                        {ingestRunning ? (
                          <>
                            <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                            Executing...
                          </>
                        ) : (
                          triggerButtonLabel
                        )}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-serif)', borderBottom: '1px solid var(--border-primary)', paddingBottom: 10, marginBottom: 20 }}>
                System Maintenance
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Redis Maintenance */}
                <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Redis Caching</h3>
                      <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.5, marginTop: 4, maxWidth: 450 }}>
                        The frontend leverages a Redis cache for news listings to support sub-100ms response times. Clear the cache if you make database modifications or manually edit content that needs to display instantly.
                      </p>
                    </div>
                    <button
                      onClick={handleClearCache}
                      disabled={cacheClearing}
                      className="ir-btn-primary"
                      style={{ width: 'auto', padding: '10px 20px', borderRadius: 6, background: 'var(--ir-crimson)', color: '#fff', cursor: 'pointer' }}
                    >
                      {cacheClearing ? 'Flushing...' : 'Flush Redis Cache'}
                    </button>
                  </div>
                  {cacheMsg && (
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: cacheMsg.includes('success') ? '#10b981' : 'var(--ir-crimson)' }}>
                      {cacheMsg}
                    </div>
                  )}
                </div>

                {/* Vector Index Maintenance */}
                <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vector Index Coverage</h3>
                      <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.5, marginTop: 4, maxWidth: 520 }}>
                        Unified article chunks power semantic search and the closed-domain chat surface. Use the backfill action after a database reset or whenever older articles need embeddings.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={loadRagStatus}
                        disabled={ragRefreshing}
                        className="ir-login-btn"
                        style={{ width: 'auto', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}
                      >
                        {ragRefreshing ? 'Refreshing...' : 'Refresh Status'}
                      </button>
                      <button
                        onClick={handleRagBackfill}
                        disabled={ragBackfillRunning}
                        className="ir-btn-primary"
                        style={{ width: 'auto', padding: '10px 20px', borderRadius: 6, background: 'var(--ir-crimson)', color: '#fff', cursor: 'pointer' }}
                      >
                        {ragBackfillRunning ? 'Backfilling...' : 'Backfill Missing Vectors'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 18 }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 6, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>Coverage</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)', marginTop: 4 }}>{ragStatus?.coverage?.coveragePercent ?? stats?.ragCoverage?.coveragePercent ?? 0}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 6, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>Indexed Articles</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)', marginTop: 4 }}>{ragStatus?.coverage?.indexedArticles ?? stats?.ragCoverage?.indexedArticles ?? 0}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 6, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>Missing Articles</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)', marginTop: 4 }}>{ragStatus?.coverage?.missingArticles ?? stats?.ragCoverage?.missingArticles ?? 0}</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 6, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>Total Chunks</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)', marginTop: 4 }}>{ragStatus?.coverage?.totalChunks ?? stats?.ragCoverage?.totalChunks ?? 0}</div>
                    </div>
                  </div>

                  {ragStatus?.coverage?.chunksByType && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, fontSize: 11, fontWeight: 700, color: 'var(--color-ink-muted)' }}>
                      {Object.entries(ragStatus.coverage.chunksByType).map(([type, count]) => (
                        <span key={type} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 999, padding: '4px 10px' }}>
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {ragStatus?.status && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 12 }}>
                      <div>Vector job status: <strong style={{ color: 'var(--color-ink)' }}>{ragStatus.status.status}</strong></div>
                      <div>{ragStatus.status.message}</div>
                      {ragStatus.status.startedAt && <div>Started: <span style={{ color: 'var(--color-ink)' }}>{new Date(ragStatus.status.startedAt).toLocaleString('en-IN')}</span></div>}
                      {ragStatus.status.completedAt && <div>Completed: <span style={{ color: 'var(--color-ink)' }}>{new Date(ragStatus.status.completedAt).toLocaleString('en-IN')}</span></div>}
                      {ragMsg && <div style={{ color: ragMsg.toLowerCase().includes('fail') ? 'var(--ir-crimson)' : 'var(--color-ink-muted)' }}>{ragMsg}</div>}
                    </div>
                  )}
                </div>

                {/* Database Maintenance */}
                <div style={{ padding: 20, border: '1.5px solid var(--border-primary)', borderRadius: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Database Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span>Postgres Database Status: <strong style={{ color: 'var(--color-ink)' }}>Online (Supabase Connection Pooler)</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span>Prisma Schema Client: <strong style={{ color: 'var(--color-ink)' }}>Generated & Synchronized</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span>User Persistence Engine: <strong style={{ color: 'var(--color-ink)' }}>Active (Encrypted via Crypto sync)</strong></span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
