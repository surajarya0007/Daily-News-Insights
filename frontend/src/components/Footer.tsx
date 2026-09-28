'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { categoryPath } from '../lib/seo';

const NAV_SECTIONS = ['India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'];

const COMPANY_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Chat', href: '/chat' },
  { label: 'Advertise', href: '/advertise' },
  { label: 'E-Paper', href: '/e-paper' },
  { label: 'Ethics Policy', href: '/ethics-policy' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Cookie Policy', href: '/privacy-policy' },
];

interface FooterProps {
  onNavChange?: (nav: string) => void;
  onDisclaimerClick?: () => void;
}

export default function Footer({ onNavChange, onDisclaimerClick }: FooterProps) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionClick = (section: string) => {
    if (onNavChange) {
      onNavChange(section);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(section === 'Home' ? '/' : categoryPath(section));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <footer className="ir-footer" style={{ marginTop: 'var(--spacing-md)' }}>
        <div className="ir-container" style={{ padding: 'var(--spacing-xxl) var(--container-padding) 0' }}>
          {/* Main Grid */}
          <div className="ir-footer-grid" style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr',
            gap: 'var(--spacing-xl)', marginBottom: 'var(--spacing-xl)',
          }}>
            {/* Column 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, height: 28 }}>
                <img 
                  src="/logo-dark.png" 
                  alt="Daily News Insights Logo" 
                  style={{ height: '100%', width: 'auto', display: 'block' }} 
                />
                <span style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em',
                  color: '#fff', marginLeft: 8,
                }}>
                  DAILY NEWS INSIGHTS
                </span>
              </div>
              <p style={{
                fontSize: 13, lineHeight: 1.75, color: 'var(--footer-muted)', maxWidth: 340,
                marginBottom: 20,
              }}>
                India&apos;s autonomous AI-powered news intelligence platform. We deliver real-time,
                AI-synthesized news covering India, World, Business, Tech, Science, Health and more
                — updated every 15 minutes.
              </p>

              {/* Social Icons (No circular background wrapper) */}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                {[
                  { label: 'Twitter', icon: '𝕏' },
                  { label: 'Facebook', icon: 'f' },
                  { label: 'Instagram', icon: '📷' },
                  { label: 'YouTube', icon: '▶' },
                  { label: 'LinkedIn', icon: 'in' },
                ].map(social => (
                  <a
                    key={social.label}
                    href="#"
                    title={social.label}
                    style={{
                      fontSize: 15,
                      color: 'var(--footer-link)',
                      transition: 'color 0.2s',
                      textDecoration: 'none',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--ir-crimson)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--footer-link)';
                    }}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Column 2: Sections in 2 Columns */}
            <div>
              <h4 className="ir-footer-heading">Sections</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                {NAV_SECTIONS.map(section => (
                  <button
                    key={section}
                    onClick={() => handleSectionClick(section)}
                    className="ir-footer-link"
                    style={{ textAlign: 'left', border: 'none', background: 'none' }}
                  >
                    <span className="ir-footer-link-inner">{section}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Column 3: Company */}
            <div>
              <h4 className="ir-footer-heading">Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                {COMPANY_LINKS.map(link => (
                  <a key={link.href} href={link.href} className="ir-footer-link">
                    <span className="ir-footer-link-inner">{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Column 4: Legal */}
            <div>
              <h4 className="ir-footer-heading">Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                {LEGAL_LINKS.map(link => {
                  if (link.label === 'Disclaimer') {
                    return (
                      <a
                        key={link.label}
                        href="/disclaimer"
                        onClick={(e) => {
                          if (onDisclaimerClick) {
                            e.preventDefault();
                            onDisclaimerClick();
                          }
                        }}
                        className="ir-footer-link"
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: '5px 0',
                          fontFamily: 'var(--font-sans)',
                          display: 'inline-block',
                        }}
                      >
                        <span className="ir-footer-link-inner">{link.label}</span>
                      </a>
                    );
                  }
                  return (
                    <a key={link.label} href={link.href} className="ir-footer-link">
                      <span className="ir-footer-link-inner">{link.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            borderTop: '1px solid var(--footer-border)',
            padding: '20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#555',
          }}>
            <span>© 2026 Daily News Insights. All Rights Reserved.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <a
                href="/disclaimer"
                onClick={(e) => {
                  if (onDisclaimerClick) {
                    e.preventDefault();
                    onDisclaimerClick();
                  }
                }}
                className="ir-footer-link"
                style={{
                  fontSize: 12,
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span className="ir-footer-link-inner">Disclaimer</span>
              </a>
              <a href="/privacy-policy" className="ir-footer-link" style={{ fontSize: 12, padding: 0 }}>
                <span className="ir-footer-link-inner">Privacy Policy</span>
              </a>
              <a href="/terms" className="ir-footer-link" style={{ fontSize: 12, padding: 0 }}>
                <span className="ir-footer-link-inner">Terms</span>
              </a>
              <a href="/contact" className="ir-footer-link" style={{ fontSize: 12, padding: 0 }}>
                <span className="ir-footer-link-inner">Contact</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        title="Back to top"
      >
        <ChevronUp style={{ width: 20, height: 20 }} />
      </button>
    </>
  );
}
