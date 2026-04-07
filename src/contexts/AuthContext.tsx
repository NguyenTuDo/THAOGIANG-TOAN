import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthProfile } from '../types';
import { ROLE_PERMISSIONS } from '../lib/permissions';

interface AuthContextValue {
  profile: AuthProfile;
  isAuthenticated: boolean;
  isBackendEnabled: boolean;
  loading: boolean;
  signIn: (_email: string, _password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: () => void;
  refreshProfile: () => Promise<void>;
}

const LOCAL_ADMIN_PROFILE: AuthProfile = {
  id: 'local-admin',
  email: 'local@admin',
  role: 'admin',
  displayName: 'Quan tri cuc bo',
};

const GUEST_PROFILE: AuthProfile = {
  id: 'guest',
  email: '',
  role: 'guest',
  displayName: 'Khach xem thu',
};

const DEMO_ADMIN_KEY = 'tourist.demo.admin';
const AuthContext = createContext<AuthContextValue | null>(null);

function isLocalAdminEnabled(): boolean {
  return localStorage.getItem(DEMO_ADMIN_KEY) === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile>(GUEST_PROFILE);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    setProfile(isLocalAdminEnabled() ? LOCAL_ADMIN_PROFILE : GUEST_PROFILE);
    setLoading(false);
  };

  useEffect(() => {
    void refreshProfile();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    isAuthenticated: profile.role !== 'guest',
    isBackendEnabled: false,
    loading,
    async signIn() {
      localStorage.setItem(DEMO_ADMIN_KEY, 'true');
      setProfile(LOCAL_ADMIN_PROFILE);
    },
    async signOut() {
      localStorage.removeItem(DEMO_ADMIN_KEY);
      setProfile(GUEST_PROFILE);
    },
    switchDemoRole() {
      localStorage.setItem(DEMO_ADMIN_KEY, 'true');
      setProfile(LOCAL_ADMIN_PROFILE);
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
