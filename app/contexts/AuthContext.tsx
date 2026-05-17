'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios, { AxiosInstance } from 'axios';
import {
  storeTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  storeUser,
  getStoredUser,
  hasTokens,
  shouldRefreshToken,
  logAuthEvent,
  isTokenExpired,
} from '@/app/lib/auth';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'Employee';
  employeeId?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean, recaptchaToken: string) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string, fullName: string, recaptchaToken: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTokenTimeout = useRef<NodeJS.Timeout>();
  const isRefreshing = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const api: AxiosInstance = axios.create({
    baseURL: apiUrl,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: Add token to requests
  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor: Handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Prevent multiple refresh attempts
        if (isRefreshing.current) {
          return Promise.reject(error);
        }

        try {
          isRefreshing.current = true;
          await handleRefreshToken();
          
          // Retry original request
          const newToken = getAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          handleLogout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing.current = false;
        }
      }

      return Promise.reject(error);
    }
  );

  // Handle token refresh
  const handleRefreshToken = async () => {
    try {
      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        throw new Error('No refresh token');
      }

      const response = await api.post('/api/auth/refresh', {
        refreshToken: refreshTokenValue,
      });

      storeTokens(response.data.accessToken, refreshTokenValue);
      logAuthEvent('Token refreshed');
    } catch (error) {
      logAuthEvent('Token refresh failed', error);
      handleLogout();
      throw error;
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearTokens();
    setUser(null);
    if (refreshTokenTimeout.current) {
      clearTimeout(refreshTokenTimeout.current);
    }
    logAuthEvent('User logged out');
  };

  // Setup automatic token refresh
  const setupTokenRefresh = () => {
    if (refreshTokenTimeout.current) {
      clearTimeout(refreshTokenTimeout.current);
    }

    // Check token status every minute
    refreshTokenTimeout.current = setInterval(() => {
      if (shouldRefreshToken()) {
        handleRefreshToken().catch(() => {
          handleLogout();
        });
      }
    }, 60000); // Check every 60 seconds
  };

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getAccessToken();
        const storedUser = getStoredUser();

        if (token && storedUser) {
          // Check if token is expired
          if (isTokenExpired(token)) {
            // Try to refresh
            try {
              await handleRefreshToken();
              setUser(storedUser);
              setupTokenRefresh();
            } catch (error) {
              clearTokens();
              setUser(null);
            }
          } else {
            setUser(storedUser);
            setupTokenRefresh();
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        logAuthEvent('Auth initialization error', error);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (refreshTokenTimeout.current) {
        clearTimeout(refreshTokenTimeout.current);
      }
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean, recaptchaToken: string) => {
    try {
      logAuthEvent('Login attempt', { email });

      const response = await api.post('/api/auth/login', {
        email,
        password,
        rememberMe,
        recaptchaToken,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens and user
      storeTokens(accessToken, refreshToken);
      storeUser(user);
      setUser(user);

      // Setup token refresh
      setupTokenRefresh();

      logAuthEvent('Login successful', { userId: user.id, email: user.email });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      logAuthEvent('Login failed', { email, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const register = async (username: string, email: string, password: string, confirmPassword: string, fullName: string, recaptchaToken: string) => {
    try {
      logAuthEvent('Registration attempt', { username, email });

      const response = await api.post('/api/auth/register', {
        username,
        email,
        password,
        confirmPassword,
        fullName,
        role: 'Employee',
        recaptchaToken,
      });

      const { user, accessToken, refreshToken } = response.data;

      // Store tokens and user
      storeTokens(accessToken, refreshToken);
      storeUser(user);
      setUser(user);

      // Setup token refresh
      setupTokenRefresh();

      logAuthEvent('Registration successful', { userId: user.id, email: user.email });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      logAuthEvent('Registration failed', { email, error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    handleLogout();
  };

  const refreshToken = async () => {
    await handleRefreshToken();
  };

  const updateUser = (updatedUser: User) => {
    storeUser(updatedUser);
    setUser(updatedUser);
    logAuthEvent('User updated', { userId: updatedUser.id });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
