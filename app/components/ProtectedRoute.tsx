'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Admin' | 'Employee';
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute component for route protection
 * - Redirects to login if not authenticated
 * - Redirects to unauthorized if role doesn't match
 * - Shows loading state while checking authentication
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Skip redirect during SSR
    if (typeof window === 'undefined') {
      return;
    }

    // Wait for auth to load
    if (isLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!isAuthenticated) {
      redirect('/login');
    }

    // Redirect if role doesn't match
    if (requiredRole && user?.role !== requiredRole) {
      redirect('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, requiredRole]);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-foreground/60">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if role doesn't match (will redirect)
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
