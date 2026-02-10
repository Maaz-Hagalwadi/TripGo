import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      console.log('checkAuth - token from localStorage:', token ? 'exists' : 'missing');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('Calling /users/me with token');
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Auth check response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User data from /users/me:', data);
        
        // Extract primary role from roles array (prioritize higher roles)
        let primaryRole = null;
        if (data.roles && data.roles.length > 0) {
          // Check in priority order: ADMIN > OPERATOR > USER
          if (data.roles.includes('ROLE_ADMIN')) {
            primaryRole = 'ADMIN';
          } else if (data.roles.includes('ROLE_OPERATOR')) {
            primaryRole = 'OPERATOR';
          } else if (data.roles.includes('ROLE_USER')) {
            primaryRole = 'USER';
          }
        }
        
        console.log('Roles from backend:', data.roles);
        console.log('Extracted primary role:', primaryRole);
        
        const userData = { ...data, role: primaryRole };
        console.log('Processed user data with role:', userData);
        
        setIsAuthenticated(true);
        setUser(userData);
      } else {
        console.log('Auth check failed');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login response data:', data);
        console.log('accessToken exists:', !!data.accessToken);
        console.log('refreshToken exists:', !!data.refreshToken);
        
        if (data.accessToken && data.refreshToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          console.log('Tokens stored in localStorage');
          console.log('Verify token in storage:', localStorage.getItem('accessToken') ? 'found' : 'NOT FOUND');
          // Small delay to ensure localStorage is updated
          await new Promise(resolve => setTimeout(resolve, 100));
          await checkAuth();
          return { success: true };
        } else {
          console.error('Tokens not found in response:', data);
          return { success: false, error: 'Invalid response from server' };
        }
      }
      
      const data = await response.json();
      return { success: false, error: data.error || data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading, 
      login, 
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};