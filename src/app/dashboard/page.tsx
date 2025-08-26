
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Notebook, LogOut } from 'lucide-react';
import { KeepKnowLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

    async function fetchProfile() {
      try {
        const userProfile = await getUserProfile(user!.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setProfile(null); // Ensure profile is null on error
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, authLoading, router]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isActive = profile?.status === 'active';
  const isPending = profile?.status === 'pending_approval';

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div>
            <div className="mb-8 flex flex-col items-center justify-center space-y-4">
            <KeepKnowLogo className="h-16 w-16 text-primary" />
            <h1 className="font-headline text-5xl font-bold tracking-tighter">
                Willkommen!
            </h1>
            <p className="text-muted-foreground">{profile?.email}</p>
            </div>

            <Card>
            <CardHeader>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>Wählen Sie eine Aktion aus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isPending && (
                <Alert>
                    <AlertTitle>Konto ausstehend</AlertTitle>
                    <AlertDescription>
                    Ihr Konto wartet auf die Freigabe durch einen Administrator. Sie werden per E-Mail benachrichtigt.
                    </AlertDescription>
                </Alert>
                )}

                <Button
                onClick={() => router.push('/notes')}
                className="w-full justify-start"
                disabled={!isActive}
                >
                <Notebook className="mr-2 h-4 w-4" />
                Notizen verwalten
                </Button>

                <Button
                onClick={() => router.push('/admin')}
                className="w-full justify-start"
                disabled={!isAdmin || !isActive}
                >
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
                </Button>
                
                <Button onClick={handleLogout} className="w-full" variant="secondary">
                    <LogOut className="mr-2 h-4 w-4" />
                    Ausloggen
                </Button>
            </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
