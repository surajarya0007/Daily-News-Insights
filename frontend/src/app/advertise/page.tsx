import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';
import { DollarSign, Eye, Award, Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Advertise | Daily News Insights',
  description: 'Reach the Daily News Insights audience with premium placements and native advertising opportunities.',
};

const METRICS = [
  { icon: <Eye style={{ width: 24, height: 24 }} />, label: 'Monthly Pageviews', value: '1.2M+' },
  { icon: <Award style={{ width: 24, height: 24 }} />, label: 'Avg Session Duration', value: '3m 45s' },
  { icon: <Megaphone style={{ width: 24, height: 24 }} />, label: 'Ad CTR Average', value: '1.82%' },
];

export default function Advertise() {
  return (
    <Layout showNav={false}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
        color: '#fff',
        padding: '60px 20px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 900,
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}>
          Advertise with Us
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto' }}>
          Connect your brand with premium readers interested in news intelligence and AI tech.
        </p>
      </div>

      <div className="static-page" style={{ maxWidth: 900 }}>
        {/* Metric Cards */}
        <ScrollReveal>
          <div className="advertise-metrics-grid" style={{ marginBottom: 48 }}>
            {METRICS.map((metric, i) => (
              <div key={i} style={{
                padding: 24,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--ir-crimson-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', color: 'var(--ir-crimson)',
                }}>
                  {metric.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 4 }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-ink)' }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Ad Types */}
        <ScrollReveal>
          <h2>Ad Placements Available</h2>
          <div className="divider-accent" />
          <p style={{ marginBottom: 28 }}>
            We offer clean, non-intrusive placements that respect user experience while ensuring viewability.
          </p>

          <div className="advertise-placements-grid" style={{ marginBottom: 48 }}>
            <div style={{
              padding: 24,
              border: '1px solid var(--border-secondary)',
              background: 'var(--bg-secondary)',
            }}>
              <h3 style={{ marginTop: 0 }}>Premium Banner Ads</h3>
              <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                Positions at the top utility bar, inline between homepage cards, or sidebar placements on article pages.
              </p>
            </div>
            <div style={{
              padding: 24,
              border: '1px solid var(--border-secondary)',
              background: 'var(--bg-secondary)',
            }}>
              <h3 style={{ marginTop: 0 }}>Sponsored Technical Dossiers</h3>
              <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                Publish whitepapers or corporate announcements seamlessly formatted in our AI-synthesis layouts.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Contact CTA */}
        <ScrollReveal>
          <div style={{
            background: 'linear-gradient(135deg, var(--ir-crimson) 0%, #b71c1c 100%)',
            color: '#fff',
            padding: '36px 40px',
            textAlign: 'center',
            borderRadius: 4,
          }}>
            <h3 style={{ fontSize: 22, color: '#fff', margin: '0 0 8px 0', fontFamily: 'var(--font-serif)' }}>
              Ready to partner with us?
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Get our rate card and media kits by sending an advertising request to our marketing desk.
            </p>
            <a href="mailto:bharatnewsnarratives@gmail.com" style={{
              display: 'inline-block',
              background: '#fff',
              color: 'var(--ir-crimson)',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '12px 36px',
              borderRadius: 4,
              textDecoration: 'none',
              transition: 'transform 0.15s',
            }}>
              Contact Marketing Desk
            </a>
          </div>
        </ScrollReveal>
      </div>
    </Layout>
  );
}
