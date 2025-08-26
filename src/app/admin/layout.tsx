'use client';

import { getUserProfile } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
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
      const profile = await getUserProfile(user!.uid);
      
      if (profile && profile.role === 'admin') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        // If not an admin, redirect them away. The notes page is a safe default.
        router.push('/notes'); 
      }
      setCheckingStatus(false);
    }

    checkAdminStatus();
  }, [user, authLoading, router]);

  if (checkingStatus) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    // This state is briefly visible during the redirect.
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page. Redirecting...
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <>{children}</>;
}
