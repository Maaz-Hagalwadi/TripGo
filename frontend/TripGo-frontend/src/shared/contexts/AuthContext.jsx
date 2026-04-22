import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchCurrentUser, loginRequest, pingHealth } from '../services/authService';
import { API_BASE_URL } from '../../config/env';
import { toast } from 'sonner';
import { scheduleProactiveRefresh } from '../../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suspendedWhileLoggedIn, setSuspendedWhileLoggedIn] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const tryRefreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      let currentToken = localStorage.getItem('accessToken');

      // No access token — try refresh before giving up
      if (!currentToken) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
          setIsAuthenticated(false);
          setUser(null);
          return null;
        }
        currentToken = localStorage.getItem('accessToken');
      }

      let result = await fetchCurrentUser(currentToken);

      // Access token expired — try refresh once
      if (!result) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          currentToken = localStorage.getItem('accessToken');
          result = await fetchCurrentUser(currentToken);
        }
      }

      if (result) {
        setIsAuthenticated(true);
        setUser(result.user);
        return result.role;
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUser(null);
        return null;
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const keepAlive = setInterval(pingHealth, 600000);

    const statusPoll = setInterval(async () => {
      const currentUser = userRef.current;
      if (!currentUser || currentUser.role !== 'OPERATOR') return;
      let token = localStorage.getItem('accessToken');
      if (!token) return;
      let result = await fetchCurrentUser(token);
      if (!result) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) return;
        token = localStorage.getItem('accessToken');
        result = await fetchCurrentUser(token);
      }
      if (!result) return;
      const status = result.user?.operatorStatus || result.user?.status;
      if (status === 'SUSPENDED') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUser(null);
        setSuspendedWhileLoggedIn(true);
      }
    }, 30000);

    return () => {
      clearInterval(keepAlive);
      clearInterval(statusPoll);
    };
  }, []);

  const login = async (credentials) => {
    const result = await loginRequest(credentials);
    if (result.error) return { success: false, error: result.error };
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    scheduleProactiveRefresh(result.accessToken);
    await checkAuth();
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const updateUser = (updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, checkAuth, updateUser, suspendedWhileLoggedIn, setSuspendedWhileLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};
