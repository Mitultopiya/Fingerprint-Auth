import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/authService';
import { setTokens, getTokens, setAuthCallbacks } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((data) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const clearAuth = useCallback(() => {
    setTokens(null, null);
    setUser(null);
  }, []);

  const loadProfile = useCallback(async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authService.getProfile();
      setUser(data.data);
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    setAuthCallbacks({
      onRefresh: (data) => setUser(data.user),
      onFailure: clearAuth,
    });
    loadProfile();
  }, [loadProfile, clearAuth]);

  const register = async (formData) => {
    const { data } = await authService.register(formData);
    applyAuth(data.data);
    return data.data;
  };

  const login = async (formData) => {
    const { data } = await authService.login(formData);
    applyAuth(data.data);
    return data.data;
  };

  const loginWithWebAuthn = async (authData) => {
    applyAuth(authData);
    return authData;
  };

  const logout = async () => {
    const { refreshToken } = getTokens();
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      clearAuth();
    }
  };

  const updateProfile = async (formData) => {
    const { data } = await authService.updateProfile(formData);
    setUser((prev) => ({ ...prev, ...data.data }));
    return data.data;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      register,
      login,
      loginWithWebAuthn,
      logout,
      updateProfile,
      refreshProfile: loadProfile,
    }),
    [user, loading, applyAuth, loadProfile]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
