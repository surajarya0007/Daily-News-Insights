'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOOGLE_ACCOUNTS = [
  { name: 'Suraj Arya', email: 'aryasuraj351@gmail.com', initial: 'S' },
  { name: 'surajarya0007', email: 'surajarya0007@gmail.com', initial: 'S' },
];

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'options' | 'email'>('options');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    resetForm();
  };

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { email: googleEmail, name: googleName } = event.data;
        // Try login. If it fails, sign them up first.
        let result = await login(googleEmail, 'google-oauth-flow-secret');
        if (!result.success) {
          result = await signup(googleName, googleEmail, 'google-oauth-flow-secret');
        }
        
        if (result.success) {
          setSuccess(`Signed in as ${googleName}`);
          setError('');
          setTimeout(() => {
            onClose();
            resetForm();
            setAuthMethod('options');
          }, 800);
        } else {
          setError('Google sign in failed. Please try again.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, signup, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    let ignore = false;

    fetch('/api/runtime-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        if (!ignore) {
          setGoogleClientId(config?.googleClientId || '');
        }
      })
      .catch((err) => {
        console.error('[LoginModal] Failed to load runtime config:', err);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'login') {
      const result = await login(email, password);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onClose();
          resetForm();
          setAuthMethod('options');
        }, 800);
      } else {
        setError(result.message);
      }
    } else {
      const result = await signup(name, email, password);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onClose();
          resetForm();
          setAuthMethod('options');
        }, 800);
      } else {
        setError(result.message);
      }
    }
  };

  const handleGoogleClick = () => {
    const clientId = googleClientId;
    
    if (!clientId || clientId.trim() === '' || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      setError('Google sign in is not configured yet.');
      return;
    }

    setError('');
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = "openid email profile";
    const nonce = "india-reports-nonce";
    const state = "google-oauth-state";
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&nonce=${nonce}` +
      `&state=${state}`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      oauthUrl,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,location=no,toolbar=no,menubar=no`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={`ir-modal-overlay open`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          setAuthMethod('options');
          resetForm();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="ir-modal"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12, // More rounded as requested
          width: '100%',
          maxWidth: 400,
          padding: 32,
          position: 'relative',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            setAuthMethod('options');
            resetForm();
          }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-faint)',
            padding: 4,
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* Logo and Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', height: 32, marginBottom: 12 }}>
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
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 900,
            color: 'var(--color-ink)',
            marginBottom: 6,
          }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
            {mode === 'login' ? 'Access your Daily News Insights dashboard' : 'Join Daily News Insights today'}
          </p>
        </div>

        {/* ── SCREEN 1: OPTIONS ──────────────────────────────────────────────── */}
        {authMethod === 'options' && (
          <div className="fade-in-content" style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.25s' }}>
            {error && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                fontSize: 13,
                color: '#991b1b',
                fontWeight: 500,
                lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '12px',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                color: '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => setAuthMethod('email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '12px',
                background: 'var(--color-ink)',
                border: 'none',
                borderRadius: 6,
                color: 'var(--bg-primary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Mail style={{ width: 18, height: 18 }} />
              Continue with Email
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--color-ink-muted)' }}>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ir-crimson)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* ── SCREEN 3: EMAIL FORM ───────────────────────────────────────────── */}
        {authMethod === 'email' && (
          <div className="fade-in-content" style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.25s' }}>
            {/* Mode Switcher Tabs with smooth background animation */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              padding: 3,
            }}>
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-sans)',
                    background: mode === m ? 'var(--bg-primary)' : 'transparent',
                    color: mode === m ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                    boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'signup' && (
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, color: 'var(--color-ink-ghost)',
                  }} />
                  <input
                    className="ir-input"
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ paddingLeft: 40, borderRadius: 6 }}
                    required
                  />
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <Mail style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16, color: 'var(--color-ink-ghost)',
                }} />
                <input
                  className="ir-input"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40, borderRadius: 6 }}
                  required
                />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16, color: 'var(--color-ink-ghost)',
                }} />
                <input
                  className="ir-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, borderRadius: 6 }}
                  required
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#991b1b',
                  fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#166534',
                  fontWeight: 500,
                }}>
                  ✓ {success}
                </div>
              )}

              <button type="submit" className="ir-btn-primary" style={{ marginTop: 4, borderRadius: 6, padding: '12px' }}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button
              onClick={() => setAuthMethod('options')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-ink-muted)',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Back to options
            </button>
          </div>
        )}

        {/* Footer Links */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-ink-ghost)', marginTop: 24, lineHeight: 1.5 }}>
          By continuing, you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--ir-crimson)', fontWeight: 600 }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy-policy" style={{ color: 'var(--ir-crimson)', fontWeight: 600 }}>Privacy Policy</a>
        </p>
      </div>

      <style jsx>{`
        .fade-in-content {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
