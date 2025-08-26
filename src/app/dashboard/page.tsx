
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getUserProfile } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { UserProfile, UserProfileQueryResult } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Notebook, LogOut, MailWarning } from 'lucide-react';
import { KeepKnowLogo } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profileQueryResult, setProfileQueryResult] = useState<UserProfileQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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
        const result = await getUserProfile(user!.uid);
        setProfileQueryResult(result);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setProfileQueryResult({ profile: null, debug: { error: error, uid: user!.uid, docsFound: 0 }});
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

  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        toast({
          title: "Bestätigungs-E-Mail gesendet",
          description: "Bitte überprüfen Sie Ihren Posteingang und Spam-Ordner.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Fehler beim Senden der E-Mail",
          description: `Die E-Mail konnte nicht gesendet werden. Firebase-Fehler: ${error.message}`,
        });
        console.error("Resend verification error:", error);
      }
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileQueryResult?.profile;
  const isAdmin = profile?.role === 'admin' && profile?.status === 'active';
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
            <p className="text-muted-foreground">{user?.email}</p>
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
                
                {user && !user.emailVerified && (
                  <Alert variant="destructive">
                    <MailWarning className="h-4 w-4" />
                    <AlertTitle>Email nicht verifiziert</AlertTitle>
                    <AlertDescription>
                      Bitte bestätigen Sie Ihre E-Mail-Adresse.
                      <Button variant="link" className="p-0 h-auto ml-1" onClick={handleResendVerification}>Bestätigungs-E-Mail erneut senden.</Button>
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
                disabled={!isAdmin}
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
            
            <Card className="mt-4">
                <CardHeader>
                <CardTitle>Kontrollfenster</CardTitle>
                </CardHeader>
                <CardContent>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                    <code>
                    {JSON.stringify({ auth_user: user, db_query_result: profileQueryResult }, null, 2)}
                    </code>
                </pre>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
