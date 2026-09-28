import React from 'react';
import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ScrollReveal from '../../components/ScrollReveal';
import { Mail, Phone, MapPin, Newspaper, DollarSign, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | Daily News Insights',
  description: 'Reach the Daily News Insights editorial desk, advertising team, or file DMCA correction notices.',
};

const CONTACT_CARDS = [
  {
    icon: <Mail style={{ width: 22, height: 22 }} />,
    title: 'Email',
    content: 'aryasuraj351@gmail.com',
    color: '#1565c0',
  },
  {
    icon: <Phone style={{ width: 22, height: 22 }} />,
    title: 'Phone',
    content: '+91-8931013317',
    color: '#2e7d32',
  },
  {
    icon: <MapPin style={{ width: 22, height: 22 }} />,
    title: 'Jurisdiction',
    content: 'Lucknow, Uttar Pradesh, India',
    color: '#e65100',
  },
];

const INQUIRY_TYPES = [
  {
    icon: <Newspaper style={{ width: 20, height: 20 }} />,
    title: 'Editorial',
    desc: 'For news tips, corrections, or editorial queries, email us with the subject line "Editorial".',
    color: '#1565c0',
  },
  {
    icon: <DollarSign style={{ width: 20, height: 20 }} />,
    title: 'Advertising',
    desc: 'For advertising inquiries, email us with the subject line "Advertising".',
    color: '#6a1b9a',
  },
  {
    icon: <Shield style={{ width: 20, height: 20 }} />,
    title: 'Copyright / DMCA',
    desc: 'If you believe any content or image on this site infringes your copyright, contact us with the subject line "Copyright Notice" for prompt review.',
    color: '#c62828',
  },
];

export default function ContactPage() {
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
          Contact Us
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 460, margin: '0 auto' }}>
          We welcome your feedback, corrections, and inquiries. Reach us using any of the methods below.
        </p>
      </div>

      <div className="static-page" style={{ maxWidth: 960 }}>
        {/* Contact Cards */}
        <ScrollReveal>
          <div className="contact-cards-grid" style={{ marginBottom: 48 }}>
            {CONTACT_CARDS.map((card, i) => (
              <div 
                key={i}
                style={{
                  padding: 28,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderTop: `3px solid ${card.color}`,
                  textAlign: 'center',
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `${card.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px', color: card.color,
                }}>
                  {card.icon}
                </div>
                <h3 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 8, marginTop: 0 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', margin: 0, wordBreak: 'break-word' }}>
                  {card.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Inquiry Types */}
        <ScrollReveal>
          <h2>How to Reach Us</h2>
          <div className="divider-accent" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
            {INQUIRY_TYPES.map((type, i) => (
              <div 
                key={i}
                style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  padding: 24,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderLeft: `4px solid ${type.color}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${type.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: type.color, flexShrink: 0,
                }}>
                  {type.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, marginTop: 0, color: 'var(--color-ink)' }}>{type.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', lineHeight: 1.7, margin: 0 }}>{type.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Contact Form */}
        <ScrollReveal>
          <h2>Send Us a Message</h2>
          <div className="divider-accent" />
          <form style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: 32,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: '8px',
            marginBottom: 48,
          }}>
            <div className="contact-form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 6 }}>
                  Full Name
                </label>
                <input className="ir-input" type="text" placeholder="Your name" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 6 }}>
                  Email Address
                </label>
                <input className="ir-input" type="email" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 6 }}>
                Subject
              </label>
              <input className="ir-input" type="text" placeholder="What is this about?" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink-muted)', marginBottom: 6 }}>
                Message
              </label>
              <textarea
                className="ir-input"
                placeholder="Your message..."
                rows={5}
                style={{ resize: 'vertical' }}
              />
            </div>
            <button type="submit" className="ir-btn-primary" style={{ width: 'fit-content', padding: '12px 40px' }}>
              Send Message
            </button>
          </form>
        </ScrollReveal>
      </div>

    </Layout>
  );
}
