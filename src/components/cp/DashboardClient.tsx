
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { LoadingScreen } from '../LoadingScreen';

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // This can be a redirect or a login prompt
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please log in to view this page.</p>
      </div>
    );
  }

  return <main className="p-4 sm:p-6 lg:p-8">{children}</main>;
}
