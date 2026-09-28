import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';
import { Cpu, Globe, Database, Zap, Newspaper, Shield, Users, Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Daily News Insights',
  description: "Learn about India's autonomous AI news synthesis pipeline, technologies, and team.",
};

const PIPELINE_STEPS = [
  { icon: <Globe style={{ width: 24, height: 24 }} />, title: 'Discover', desc: 'We continuously scan Google News RSS feeds across 10+ categories to discover breaking stories from India and the world.' },
  { icon: <Cpu style={{ width: 24, height: 24 }} />, title: 'Extract', desc: 'A fast native scraping engine (with Firecrawl fallback) extracts clean content, images, and metadata from source publications.' },
  { icon: <Zap style={{ width: 24, height: 24 }} />, title: 'Synthesize', desc: 'Google Gemini 1.5 Flash analyzes each article, generating structured summaries, key facts, sentiment analysis, and editorial sections.' },
  { icon: <Database style={{ width: 24, height: 24 }} />, title: 'Publish', desc: 'Enriched stories are stored in Supabase (PostgreSQL) and cached via Upstash Redis, then delivered instantly to your screen.' },
];

const TECH_STACK = [
  { name: 'Gemini 1.5 Flash', role: 'AI Synthesis', color: '#4285f4' },
  { name: 'Firecrawl', role: 'Web Scraping', color: '#e65100' },
  { name: 'Supabase', role: 'Database', color: '#3ecf8e' },
  { name: 'Upstash Redis', role: 'Caching', color: '#00e9a3' },
  { name: 'Next.js', role: 'Frontend', color: '#000000' },
  { name: 'Express.js', role: 'Backend API', color: '#333333' },
];

export default function AboutPage() {
  return (
    <Layout showNav={false}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
        color: '#fff',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', height: 48, marginBottom: 20 }}>
            <img 
              src="/logo-dark.png" 
              alt="Daily News Insights Logo" 
              style={{ height: '100%', width: 'auto', display: 'block' }} 
            />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            About Daily News Insights
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto' }}>
            A fully autonomous AI-powered news intelligence platform,
            delivering real-time synthesized coverage across every major category.
          </p>
        </div>
      </div>

      <div className="static-page">
        {/* Mission */}
        <ScrollReveal>
          <div className="about-mission-grid" style={{ marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Target style={{ width: 20, height: 20, color: 'var(--ir-crimson)' }} />
                <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, marginTop: 0 }}>Our Mission</h2>
              </div>
              <p>
                To democratize access to comprehensive, AI-synthesized news intelligence that cuts through noise
                and delivers the essential facts from hundreds of trusted sources — updated every 15 minutes,
                completely autonomously.
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Shield style={{ width: 20, height: 20, color: 'var(--ir-crimson)' }} />
                <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, marginTop: 0 }}>Our Vision</h2>
              </div>
              <p>
                To build the most trusted, transparent, and technologically advanced news platform in India — where
                AI augments journalism rather than replacing it, and every citizen has access to clear, unbiased
                reporting.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* How It Works */}
        <ScrollReveal>
          <h2>How It Works</h2>
          <div className="divider-accent" />
          <p style={{ marginBottom: 32 }}>
            Our fully automated pipeline transforms raw news into structured intelligence reports in under 60 seconds:
          </p>
          <div className="about-pipeline-grid" style={{ marginBottom: 56 }}>
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} style={{
                padding: 24,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                borderTop: '3px solid var(--ir-crimson)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--ir-crimson-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', color: 'var(--ir-crimson)',
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ir-crimson)', marginBottom: 6 }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 8, marginTop: 0 }}>{step.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-ink-muted)', margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Tech Stack */}
        <ScrollReveal>
          <h2>Technology Stack</h2>
          <div className="divider-accent" />
          <div className="about-tech-grid" style={{ marginBottom: 56 }}>
            {TECH_STACK.map((tech, i) => (
              <div key={i} style={{
                padding: '20px 24px',
                border: '1px solid var(--border-secondary)',
                borderLeft: `4px solid ${tech.color}`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: `${tech.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: tech.color,
                  fontFamily: 'var(--font-sans)',
                }}>
                  {tech.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>{tech.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>{tech.role}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Team */}
        <ScrollReveal>
          <h2>Editorial Leadership & Oversight</h2>
          <div className="divider-accent" />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            padding: 32,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--color-ink)', color: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, fontFamily: 'Georgia, serif',
                flexShrink: 0,
              }}>
                SA
              </div>
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 4, marginTop: 0, color: 'var(--color-ink)' }}>Suraj Arya</h3>
                <div style={{ fontSize: 12, color: 'var(--ir-crimson)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 0, letterSpacing: '0.05em' }}>
                  Founder, Lead Engineer & Editor-in-Chief
                </div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.7 }}>
              Suraj Arya is a software engineer and news analyst specializing in full-stack data architectures and news intelligence frameworks. As the architect behind Daily News Insights, he designs and manages the autonomous ingestion pipelines while performing daily manual curation audits on all synthesized dossiers to ensure strict factual accuracy, contextual integrity, and high journalistic standards.
            </p>
          </div>
          
          <div style={{
            padding: 24,
            background: 'var(--bg-primary)',
            border: '1px dashed var(--border-primary)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 800 }}>E-E-A-T Content Integrity Standards</h4>
            <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.6 }}>
              We adhere strictly to Google's Search Quality Rater Guidelines. While we leverage artificial intelligence to gather 
              scattered facts across feeds, every published output goes through human-designed filtering layers and regular audits 
              to ensure readability, factuality, and value-add analysis.
            </p>
          </div>
        </ScrollReveal>
      </div>

    </Layout>
  );
}
