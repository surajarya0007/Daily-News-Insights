import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';

export const metadata: Metadata = {
  title: 'Ethics & Editorial Policy | Daily News Insights',
  description: 'Read our principles of news transparency, neutrality, source verification, and AI accountability.',
};

export default function EthicsPolicy() {
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
          Ethics & Editorial Policy
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto' }}>
          Principles of transparency, source integrity, and AI editorial standards.
        </p>
      </div>

      <div className="static-page" style={{ maxWidth: 800 }}>
        <ScrollReveal>
          <h2>1. Source Integrity and Verification</h2>
          <div className="divider-accent" />
          <p>
            We aggregatively scan verified national and international news outlets listed on RSS directories. We reject unverified blogs or fringe social media portals. Every curated article includes a direct link to the original publication to let readers trace findings back to the original journalist.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <h2>2. AI Transparency Statement</h2>
          <div className="divider-accent" />
          <p>
            Daily News Insights is openly powered by Large Language Models. We do not try to pass AI-generated summaries as human-written investigative journalism. All dossiers clearly highlight "AI Dossier Synthesis" to ensure readers are aware of the processing mechanisms used.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <h2>3. Algorithmic Neutrality and Balance</h2>
          <div className="divider-accent" />
          <p>
            Our pipeline relies on statistical and syntactic extraction. We programmatically enforce balance by extracting sentiment markers and key takeaways neutrally. We do not manually inject political biases, and our models are prompted to output factual, high-level summaries free of sensationalized vocabulary.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <h2>4. Corrections and Removal Policy</h2>
          <div className="divider-accent" />
          <p>
            If a summarized report contains inaccuracies or misrepresentations due to synthesis errors, we encourage readers and publishers to contact us. Upon review, we will manually trigger article updates or remove reports when needed.
          </p>
          <p style={{ fontWeight: 600 }}>
            Contact: aryasuraj351@gmail.com
          </p>
        </ScrollReveal>
      </div>
    </Layout>
  );
}
