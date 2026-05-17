import { useContext } from 'react';
import { AuthContext } from '@/app/contexts/AuthContext';

/**
 * Custom hook to use authentication context
 * Throws error if used outside of AuthProvider
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

/**
 * Hook to get current user
 */
export const useUser = () => {
  const { user } = useAuthContext();
  return user;
};

/**
 * Hook to check if user has admin role
 */
export const useIsAdmin = () => {
  const { user } = useAuthContext();
  return user?.role === 'Admin';
};

/**
 * Hook to check if user has specific role
 */
export const useHasRole = (role: 'Admin' | 'Employee') => {
  const { user } = useAuthContext();
  return user?.role === role;
};

/**
 * Hook to get loading state
 */
export const useAuthLoading = () => {
  const { isLoading } = useAuthContext();
  return isLoading;
};

/**
 * Hook to get login function
 */
export const useLogin = () => {
  const { login } = useAuthContext();
  return login;
};

/**
 * Hook to get logout function
 */
export const useLogout = () => {
  const { logout } = useAuthContext();
  return logout;
};

/**
 * Hook to get refresh token function
 */
export const useRefreshToken = () => {
  const { refreshToken } = useAuthContext();
  return refreshToken;
};

/**
 * Hook to get update user function
 */
export const useUpdateUser = () => {
  const { updateUser } = useAuthContext();
  return updateUser;
};
