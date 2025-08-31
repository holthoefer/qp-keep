'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { LoadingScreen } from '../LoadingScreen';
import { useRouter } from 'next/navigation';

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <main className="p-4 sm:p-6 lg:p-8">{children}</main>;
}
