import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchCurrentUser, loginRequest, pingHealth } from '../services/authService';
import { toast } from 'sonner';

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

  useEffect(() => {
    checkAuth();
    const keepAlive = setInterval(pingHealth, 600000);
    // Poll every 30 seconds to detect suspension while logged in
    const statusPoll = setInterval(async () => {
      const currentUser = userRef.current;
      if (!currentUser || currentUser.role !== 'OPERATOR') return;
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const result = await fetchCurrentUser(token);
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

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return null;
      }

      const result = await fetchCurrentUser(token);
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

  const login = async (credentials) => {
    const result = await loginRequest(credentials);
    if (result.error) return { success: false, error: result.error };

    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
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
