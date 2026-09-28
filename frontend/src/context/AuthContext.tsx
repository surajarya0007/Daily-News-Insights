'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');

interface User {
  email: string;
  displayName: string;
  avatarInitial: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  login: async () => ({ success: false, message: '' }),
  signup: async () => ({ success: false, message: '' }),
  logout: () => {},
});

const STORAGE_KEY = 'ir-auth-user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
    setMounted(true);
  }, []);

  const persistUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      return { success: false, message: 'Please fill in all fields.' };
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        persistUser(data.user);
        return { success: true, message: data.message || 'Welcome back!' };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      return { success: false, message: 'Failed to connect to authentication server.' };
    }
  }, [persistUser]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      return { success: false, message: 'Please fill in all fields.' };
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        persistUser(data.user);
        return { success: true, message: data.message || 'Account created successfully!' };
      } else {
        return { success: false, message: data.message || 'Signup failed.' };
      }
    } catch (err: any) {
      console.error('[AuthContext] Signup error:', err);
      return { success: false, message: 'Failed to connect to authentication server.' };
    }
  }, [persistUser]);

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
