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
    // Check for existing token and validate
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user ?? data);
      } catch (e) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // Login via PHP API
    const { data } = await api.post('/auth/login', { email, password });
    
    // Store token from PHP response
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    
    // Set user from response or fetch profile
    if (data.user) {
      setUser(data.user);
    } else {
      const { data: meData } = await api.get('/auth/me');
      setUser(meData.user ?? meData);
    }
    
    router.push('/dashboard');
  };

  const adminLogin = async (email: string, password: string) => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    
    if (data.user) {
      setUser(data.user);
    } else {
      const { data: meData } = await api.get('/auth/me');
      setUser(meData.user ?? meData);
    }
    
    router.push('/dashboard/admin');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('auth_token');
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
