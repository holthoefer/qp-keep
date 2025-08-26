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
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Warten, bis Auth-Status klar ist.

    if (!user) {
      router.push('/'); // Nicht eingeloggt -> zur Login-Seite
      return;
    }

    async function checkAdmin() {
      const profile = await getUserProfile(user!.uid);
      // Nur Admins, die auch aktiv sind, dürfen hier rein.
      if (profile && profile.role === 'admin' && profile.status === 'active') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        // Wenn kein Admin, zurück zur Haupt-Notizen-Ansicht.
        router.push('/notes'); 
      }
      setIsChecking(false);
    }

    checkAdmin();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    // Diese Ansicht wird nur kurz angezeigt, bevor die Weiterleitung greift.
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to access this page. Redirecting...
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <>{children}</>;
}
