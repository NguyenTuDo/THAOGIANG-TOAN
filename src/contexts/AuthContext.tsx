import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthProfile } from '../types';
import { getSupabase, hasSupabaseConfig } from '../lib/supabase';
import { ROLE_PERMISSIONS } from '../lib/permissions';

interface AuthContextValue {
  profile: AuthProfile;
  isAuthenticated: boolean;
  isBackendEnabled: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: () => void;
  refreshProfile: () => Promise<void>;
}

const DEMO_ADMIN_PROFILE: AuthProfile = {
  id: 'demo-admin',
  email: 'admin@demo.local',
  role: 'admin',
  displayName: 'Demo Admin',
};

const GUEST_PROFILE: AuthProfile = {
  id: 'guest',
  email: '',
  role: 'guest',
  displayName: 'Khach xem thu',
};

const DEMO_ADMIN_KEY = 'tourist.demo.admin';
const AuthContext = createContext<AuthContextValue | null>(null);

function getAllowedAdminEmails(): string[] {
  const configured = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  const emails = (configured || 'tu.donguyen123@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function buildProfile(user: User): AuthProfile {
  const normalizedEmail = (user.email ?? '').trim().toLowerCase();
  const isAdmin = user.user_metadata?.role === 'admin' || getAllowedAdminEmails().includes(normalizedEmail);
  return {
    id: user.id,
    email: user.email ?? '',
    role: isAdmin ? 'admin' : 'guest',
    displayName: user.user_metadata?.full_name || user.email || 'Nguoi dung',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile>(GUEST_PROFILE);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const supabase = getSupabase();
    if (!supabase || !hasSupabaseConfig()) {
      const isDemoAdmin = localStorage.getItem(DEMO_ADMIN_KEY) === 'true';
      setProfile(isDemoAdmin ? DEMO_ADMIN_PROFILE : GUEST_PROFILE);
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setProfile(user ? buildProfile(user) : GUEST_PROFILE);
    } catch {
      setProfile(GUEST_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !hasSupabaseConfig()) {
      void refreshProfile();
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setProfile(session?.user ? buildProfile(session.user) : GUEST_PROFILE);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(session?.user ? buildProfile(session.user) : GUEST_PROFILE);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    isAuthenticated: profile.role !== 'guest',
    isBackendEnabled: hasSupabaseConfig(),
    loading,
    async signIn(email: string, password: string) {
      const supabase = getSupabase();
      if (!supabase || !hasSupabaseConfig()) {
        throw new Error('Chua cau hinh Supabase. Hay dung che do demo hoac them bien moi truong.');
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const { data: { user } } = await supabase.auth.getUser();
      const normalizedEmail = (user?.email ?? '').trim().toLowerCase();
      const isAdmin = user?.user_metadata?.role === 'admin' || getAllowedAdminEmails().includes(normalizedEmail);
      if (isAdmin) return;

      await supabase.auth.signOut();
      throw new Error('Tài khoản này đăng nhập được nhưng chưa nằm trong danh sách admin. Hãy thêm email này vào VITE_ADMIN_EMAILS hoặc gán User Metadata {"role":"admin"}.');
    },
    async signOut() {
      const supabase = getSupabase();
      if (!supabase || !hasSupabaseConfig()) {
        localStorage.removeItem(DEMO_ADMIN_KEY);
        setProfile(GUEST_PROFILE);
        return;
      }
      await supabase.auth.signOut();
      setProfile(GUEST_PROFILE);
    },
    switchDemoRole() {
      localStorage.setItem(DEMO_ADMIN_KEY, 'true');
      setProfile(DEMO_ADMIN_PROFILE);
    },
    refreshProfile,
  }), [loading, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function useRolePermissions() {
  const { profile } = useAuth();
  return ROLE_PERMISSIONS[profile.role];
}
