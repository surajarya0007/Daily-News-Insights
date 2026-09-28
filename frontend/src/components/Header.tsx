'use client';

import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Menu, X, Cpu, Sun, Moon, User, LogOut,
  ChevronRight, Globe, BookOpen, Shield, Mail, Newspaper, FileText, Scale,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { categoryPath } from '../lib/seo';
import WeatherWidget from './WeatherWidget';
import LoginModal from './LoginModal';

const NAV_ITEMS = ['Home', 'India', 'World', 'Business', 'Tech', 'Sports', 'Science', 'Finance', 'Health', 'Entertainment', 'Politics'];

const DRAWER_PAGES = [
  { label: 'About Us', href: '/about', icon: <BookOpen style={{ width: 16, height: 16 }} /> },
  { label: 'Contact', href: '/contact', icon: <Mail style={{ width: 16, height: 16 }} /> },
  { label: 'E-Paper', href: '/e-paper', icon: <Newspaper style={{ width: 16, height: 16 }} /> },
  { label: 'Chat', href: '/chat', icon: <Cpu style={{ width: 16, height: 16 }} /> },
  { label: 'Advertise', href: '/advertise', icon: <Globe style={{ width: 16, height: 16 }} /> },
  { label: 'Ethics Policy', href: '/ethics-policy', icon: <Shield style={{ width: 16, height: 16 }} /> },
  { label: 'Privacy Policy', href: '/privacy-policy', icon: <FileText style={{ width: 16, height: 16 }} /> },
  { label: 'Terms', href: '/terms', icon: <Scale style={{ width: 16, height: 16 }} /> },
  { label: 'Disclaimer', href: '/disclaimer', icon: <FileText style={{ width: 16, height: 16 }} /> },
];

interface HeaderProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  onSearch?: (query: string) => void;
  onIngest?: () => void;
  ingesting?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  showNav?: boolean;
  onDisclaimerClick?: () => void;
}

export default function Header({
  activeNav = 'Home',
  onNavChange,
  onSearch,
  onIngest,
  ingesting = false,
  searchQuery = '',
  onSearchQueryChange,
  showNav = true,
  onDisclaimerClick,
}: HeaderProps) {
  const router = useRouter();
  const { toggleTheme, isDark, mounted: themeMounted } = useTheme();
  const { user, isLoggedIn, logout } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [now] = useState(new Date());

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  const desktopInputRef = React.useRef<HTMLInputElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalQuery(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        if (window.innerWidth >= 768) {
          desktopInputRef.current?.focus();
        } else {
          mobileInputRef.current?.focus();
        }
      }, 100);
    }
  }, [searchOpen]);

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (localQuery.trim()) {
      if (onSearch) {
        onSearch(localQuery.trim());
      } else {
        router.push(`/?q=${encodeURIComponent(localQuery.trim())}`);
      }
    }
  }, [localQuery, onSearch, router]);

  const clearSearch = useCallback(() => {
    setLocalQuery('');
    onSearchQueryChange?.('');
    setSearchOpen(false);
  }, [onSearchQueryChange]);

  const handleNavClick = useCallback((item: string) => {
    const target = item === 'Home' ? '/' : categoryPath(item);

    void router.prefetch(target);

    if (onNavChange) {
      onNavChange(item);
    } else {
      startTransition(() => {
        router.push(target);
      });
    }
    setDrawerOpen(false);
  }, [onNavChange, router]);

  return (
    <>
      {/* ── Main Header Bar (Utility Top bar removed) ── */}
      <header className={`ir-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="ir-container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 'var(--header-height)', position: 'relative',
        }}>
          
          {/* Left: Sidebar Icon + Date/Time Info Inline */}
          <div className="ir-header-left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
               onClick={() => setDrawerOpen(!drawerOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: 4, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink)',
                minWidth: 44, minHeight: 44, padding: 0
              }}
              title="Menu"
              aria-label="Menu"
            >
              {drawerOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
            </button>

            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }} className="hide-mobile">
              {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            
            <span style={{ width: 1, height: 16, background: 'var(--border-secondary)' }} className="hide-mobile" />
            
            <div className="hide-mobile">
              <WeatherWidget />
            </div>
          </div>

          {/* Center: Logo */}
          <a href="/" style={{
            textDecoration: 'none',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          }}>
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
          </a>

          {/* Right: Search, Ingestion, Theme, Login */}
          <div className="ir-header-right" style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <form
                onSubmit={handleSearchSubmit}
                className="hide-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  width: searchOpen ? 180 : 0,
                  opacity: searchOpen ? 1 : 0,
                  pointerEvents: searchOpen ? 'auto' : 'none',
                  marginRight: searchOpen ? 6 : 0,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                }}
              >
                <input
                  ref={desktopInputRef}
                  value={localQuery}
                  onChange={e => {
                    setLocalQuery(e.target.value);
                    onSearchQueryChange?.(e.target.value);
                  }}
                  placeholder="Search..."
                  className="ir-input"
                  tabIndex={searchOpen ? 0 : -1}
                  style={{
                    width: '100%', padding: '6px 32px 6px 12px', fontSize: 13, borderRadius: 6,
                  }}
                />
                <button
                  type="button"
                  onClick={clearSearch}
                  tabIndex={searchOpen ? 0 : -1}
                  style={{
                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-ink-muted)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32
                  }}
                  title="Close Search"
                  aria-label="Clear Search"
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </form>
              
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: searchOpen ? 0 : 1,
                  pointerEvents: searchOpen ? 'none' : 'auto',
                  width: searchOpen ? 0 : 44,
                  height: searchOpen ? 0 : 44,
                  padding: 0,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                }}
                title="Search"
                aria-label="Search"
              >
                <Search style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={themeMounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle theme'}
              className="hide-mobile"
              aria-label={themeMounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle theme'}
              style={{
                color: 'var(--color-ink)', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, transition: 'transform 0.2s', width: 44, height: 44,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(15deg)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
            >
              {themeMounted ? (
                isDark ? <Sun style={{ width: 20, height: 20 }} /> : <Moon style={{ width: 20, height: 20 }} />
              ) : (
                <span aria-hidden="true" style={{ width: 20, height: 20, display: 'inline-block' }} />
              )}
            </button>

            {/* Login / Profile dropdown */}
            {isLoggedIn && user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-ink)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--ir-crimson)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {user.avatarInitial}
                  </span>
                  <span className="hide-mobile">{user.displayName}</span>
                </button>
                
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: 8, padding: 8, minWidth: 160,
                    boxShadow: 'var(--shadow-lg)', zIndex: 100,
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-ink-muted)', borderBottom: '1px solid var(--border-secondary)', marginBottom: 4 }}>
                      {user.email}
                    </div>
                    {user.role === 'admin' && (
                      <a
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '8px 12px', textDecoration: 'none',
                          cursor: 'pointer', fontSize: 12, color: 'var(--color-ink)',
                          fontWeight: 600, borderRadius: 4, fontFamily: 'var(--font-sans)',
                          marginBottom: 4
                        }}
                      >
                        <Cpu style={{ width: 14, height: 14 }} />
                        Admin Dashboard
                      </a>
                    )}
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 12px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 12, color: 'var(--ir-crimson)',
                        fontWeight: 600, borderRadius: 4, fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <LogOut style={{ width: 14, height: 14 }} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="ir-login-btn"
                aria-label="Login"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '1.5px solid var(--border-primary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--color-ink)',
                  borderRadius: 24, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--color-ink-muted)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                }}
              >
                <User style={{ width: 15, height: 15 }} />
                <span className="hide-mobile">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Full-Width Search Bar */}
        <div className={`ir-mobile-search-bar ${searchOpen ? 'open' : ''}`}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', position: 'relative' }}>
            <input
              ref={mobileInputRef}
              value={localQuery}
              onChange={e => {
                setLocalQuery(e.target.value);
                onSearchQueryChange?.(e.target.value);
              }}
              placeholder="Search headlines, topics..."
              className="ir-input"
              tabIndex={searchOpen ? 0 : -1}
              style={{
                width: '100%',
                paddingRight: 36,
              }}
            />
            <button
              type="button"
              onClick={clearSearch}
              tabIndex={searchOpen ? 0 : -1}
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-ink-muted)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44
              }}
              title="Close Search"
              aria-label="Clear Search"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </form>
        </div>

        {/* Navigation Bar */}
        {showNav && (
          <div className="ir-nav-desktop" style={{ borderTop: '1px solid var(--border-faint)' }}>
            <div className="ir-container" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0,
            }}>
              {NAV_ITEMS.map(item => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className={`ir-nav-item ${item === activeNav ? 'active' : ''}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Drawer Overlay ────────────────────────────────────────────── */}
      <div
        className={`ir-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      <nav className={`ir-drawer ${drawerOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 24 }}>
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
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)',
              minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
            aria-label="Close menu"
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Category Links */}
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: '8px 24px', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--color-ink-faint)',
          }}>
            Sections
          </div>
          {NAV_ITEMS.map(item => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className={`ir-drawer-link ${item === activeNav ? 'active' : ''}`}
            >
              <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
              {item}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '8px 24px' }} />

        {/* Page Links */}
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: '8px 24px', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--color-ink-faint)',
          }}>
            Pages
          </div>
          {DRAWER_PAGES.map(page => {
            if (page.label === 'Disclaimer') {
              return (
                <button
                  key={page.label}
                  className="ir-drawer-link"
                  onClick={() => {
                    setDrawerOpen(false);
                    onDisclaimerClick?.();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {page.icon}
                  {page.label}
                </button>
              );
            }
            return (
              <a
                key={page.href}
                href={page.href}
                className="ir-drawer-link"
                onClick={() => setDrawerOpen(false)}
              >
                {page.icon}
                {page.label}
              </a>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '8px 24px' }} />

        {/* Dark mode in drawer */}
        <div style={{ padding: '12px 24px' }}>
          <button
            onClick={toggleTheme}
            className="ir-drawer-link"
            style={{ border: 'none', padding: '10px 0', borderBottom: 'none' }}
          >
            {themeMounted ? (
              isDark ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />
            ) : (
              <span aria-hidden="true" style={{ width: 16, height: 16, display: 'inline-block' }} />
            )}
            {themeMounted ? (isDark ? 'Light Mode' : 'Dark Mode') : 'Theme'}
          </button>
        </div>

        {/* Login in drawer */}
        {!isLoggedIn ? (
          <div style={{ padding: '12px 24px' }}>
            <button
              onClick={() => { setLoginOpen(true); setDrawerOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%',
                border: '1.5px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--color-ink)',
                borderRadius: 24, padding: '10px 18px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-ink-muted)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.borderColor = 'var(--border-primary)';
              }}
            >
              <User style={{ width: 15, height: 15 }} />
              Login
            </button>
          </div>
        ) : (
          user?.role === 'admin' && (
            <div style={{ padding: '0 24px 12px 24px' }}>
              <a
                href="/admin"
                onClick={() => setDrawerOpen(false)}
                className="ir-drawer-link"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: 'none' }}
              >
                <Cpu style={{ width: 16, height: 16 }} />
                Admin Dashboard
              </a>
            </div>
          )
        )}
      </nav>

      {/* Login Modal */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
