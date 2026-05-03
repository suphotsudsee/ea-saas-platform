'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from './api';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'TRADER' | 'ADMIN' | 'SUPER_ADMIN' | 'BILLING_ADMIN' | 'RISK_ADMIN' | 'SUPPORT';
  actorType?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isProtectedPath =
      pathname?.startsWith('/dashboard') ||
      pathname?.startsWith('/admin');

    if (!isProtectedPath) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user ?? data);
      } catch (e) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [pathname]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    // Store token for axios interceptor
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    setUser(data.user);
    router.push('/dashboard');
  };

  const adminLogin = async (email: string, password: string) => {
    await api.post('/admin/auth/login', { email, password });
    const { data } = await api.get('/auth/me');
    setUser(data.user ?? data);
    router.push('/dashboard/admin');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.clear();
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.actorType === 'admin' || ['ADMIN', 'SUPER_ADMIN', 'BILLING_ADMIN', 'RISK_ADMIN', 'SUPPORT'].includes(user?.role || '');

  return (
    <AuthContext.Provider value={{ user, isLoading, login, adminLogin, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
