
'use client';

import { getUserProfile } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';
import type { UserProfileQueryResult } from '@/lib/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profileQueryResult, setProfileQueryResult] = useState<UserProfileQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdminStatus() {
      const result = await getUserProfile(user!.uid);
      setProfileQueryResult(result);
      setLoading(false);
    }

    checkAdminStatus();
  }, [user, authLoading, router]);
  
  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileQueryResult?.profile;
  const isAuthorized = profile && profile.role === 'admin' && profile.status === 'active';

  if (!isAuthorized) {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page. Redirecting...
                     <pre className="mt-4 text-xs bg-black/80 text-white p-2 rounded-md overflow-x-auto">
                        <code>
                        {JSON.stringify({ profile, debug: profileQueryResult?.debug }, null, 2)}
                        </code>
                    </pre>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <>{children}</>;
}
