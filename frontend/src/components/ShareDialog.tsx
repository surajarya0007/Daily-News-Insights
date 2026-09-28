'use client';

import React, { useState, useEffect } from 'react';
import { X, Link2, Check, MessageCircle } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
}

const SHARE_OPTIONS = [
  { name: 'WhatsApp', color: '#25D366', icon: '💬', getUrl: (url: string, title: string) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}` },
  { name: 'Twitter', color: '#1DA1F2', icon: '🐦', getUrl: (url: string, title: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  { name: 'Facebook', color: '#1877F2', icon: '📘', getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { name: 'LinkedIn', color: '#0A66C2', icon: '💼', getUrl: (url: string, title: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { name: 'Telegram', color: '#0088CC', icon: '✈️', getUrl: (url: string, title: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  { name: 'Reddit', color: '#FF4500', icon: '🔴', getUrl: (url: string, title: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` },
  { name: 'Email', color: '#666666', icon: '✉️', getUrl: (url: string, title: string) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}` },
  { name: 'SMS', color: '#34C759', icon: '💬', getUrl: (url: string, title: string) => `sms:?body=${encodeURIComponent(title + ' ' + url)}` },
];

export default function ShareDialog({ isOpen, onClose, url, title }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url || '');

  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, [url]);

  const shareTitle = title || 'Check out this article on Daily News Insights';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = (option: typeof SHARE_OPTIONS[0]) => {
    const shareLink = option.getUrl(shareUrl, shareTitle);
    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  return (
    <div
      className={`ir-modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ir-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-ink-faint)', padding: 4,
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--color-ink)',
            marginBottom: 4,
          }}>
            Share This Story
          </h3>
          <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
            Choose a platform to share this article
          </p>
        </div>

        {/* Social Grid */}
        <div className="share-grid" style={{ marginBottom: 20 }}>
          {SHARE_OPTIONS.map((option) => (
            <button
              key={option.name}
              className="share-btn"
              onClick={() => handleShare(option)}
            >
              <div
                className="share-icon"
                style={{ background: `${option.color}15`, color: option.color }}
              >
                {option.icon}
              </div>
              {option.name}
            </button>
          ))}
        </div>

        {/* Copy URL */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          border: '1px solid var(--border-secondary)',
        }}>
          <div style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--color-ink-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}>
            {shareUrl}
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px',
              background: copied ? '#16a34a' : 'var(--color-ink)',
              color: copied ? '#fff' : 'var(--bg-primary)',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {copied ? <Check style={{ width: 12, height: 12 }} /> : <Link2 style={{ width: 12, height: 12 }} />}
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>
    </div>
  );
}
