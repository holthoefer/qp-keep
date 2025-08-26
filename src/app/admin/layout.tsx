
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getProfile } from '@/lib/data';
import { Loader2, ShieldX } from 'lucide-react';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.replace('/');
      return;
    }

    getProfile(user.uid)
      .then((profile) => {
        if (profile?.role === 'admin') {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      })
      .catch((err) => {
        console.error("Authorization check failed", err);
        setIsAuthorized(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Überprüfe Berechtigung...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldX className="mx-auto h-16 w-16 text-destructive" />
                <h1 className="mt-4 font-headline text-2xl font-bold">Zugriff verweigert</h1>
                <p className="mt-2 text-muted-foreground">
                    Sie haben nicht die erforderlichen Berechtigungen, um auf diesen Bereich zuzugreifen.
                </p>
                <Button onClick={() => router.push('/notes')} className="mt-6">
                    Zurück zu den Notizen
                </Button>
            </div>
      </div>
    );
  }

  return <>{children}</>;
}
