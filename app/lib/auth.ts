// Authentication utilities and helper functions

export interface TokenPayload {
  id: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    employeeId?: number;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Store authentication tokens in localStorage
 */
export const storeTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
  }
};

/**
 * Retrieve access token from localStorage
 */
export const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

/**
 * Retrieve refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

/**
 * Remove all authentication tokens
 */
export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenTimestamp');
  }
};

/**
 * Store user information in localStorage
 */
export const storeUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

/**
 * Retrieve user information from localStorage
 */
export const getStoredUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

/**
 * Check if tokens exist
 */
export const hasTokens = (): boolean => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    return !!(accessToken && refreshToken);
  }
  return false;
};

/**
 * Parse JWT token payload (without verification)
 * Note: This is for client-side use only. Never trust this for security decisions.
 */
export const parseToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

/**
 * Check if access token needs refresh
 * Returns true if token is expired or will expire in next 5 minutes
 */
export const shouldRefreshToken = (): boolean => {
  const accessToken = getAccessToken();
  if (!accessToken) return false;

  const payload = parseToken(accessToken);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;

  // Refresh if expired or will expire in 5 minutes
  return timeUntilExpiry < 300;
};

/**
 * Build authorization header
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Create a session with remember-me functionality
 */
export const createSession = (rememberMe: boolean) => {
  if (typeof window !== 'undefined') {
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
  }
};

/**
 * Check if remember-me is enabled
 */
export const isRememberMeEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('rememberMe') === 'true';
  }
  return false;
};

/**
 * Get time since last login
 */
export const getTimeSinceLogin = (): number | null => {
  if (typeof window !== 'undefined') {
    const timestamp = localStorage.getItem('tokenTimestamp');
    if (timestamp) {
      return Date.now() - parseInt(timestamp);
    }
  }
  return null;
};

/**
 * Log authentication event
 */
export const logAuthEvent = (event: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[Auth] ${timestamp} - ${event}`, details || '');
};
