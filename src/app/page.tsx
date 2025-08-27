
'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth-context';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile, type UserProfile } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HomePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      setProfileLoading(true);
      getProfile(user.uid)
        .then(userProfile => {
          setProfile(userProfile);
        })
        .catch(console.error)
        .finally(() => {
          setProfileLoading(false);
        });
    } else {
      // No user logged in, so no profile to load.
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  const handleLogout = async () => {
    await logout();
    router.refresh(); 
  };

  const goToNotes = () => {
    router.push('/notes');
  }

  // State 1: AuthProvider handles the main loading state
  if (authLoading) {
    return null; // The AuthProvider will show a loading screen
  }

  // State 2: User is logged in, but we might still be fetching their specific profile data
  if (user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
            <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                <KeepKnowLogo className="h-16 w-16 text-primary" />
                <h1 className="font-headline text-3xl font-bold tracking-tighter">
                    Angemeldet
                </h1>
                <p className="text-muted-foreground">Sie sind erfolgreich angemeldet.</p>
            </div>
          
            {profileLoading ? (
                 <div className="flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : (
                <div className="space-y-4">
                    <p className="font-medium">{user.email}</p>
                    <Button 
                    onClick={goToNotes} 
                    className="w-full"
                    disabled={profile?.status === 'inactive'}
                    >
                        Zur Notizenseite
                    </Button>

                    {profile?.status === 'inactive' && (
                    <Alert variant="destructive" className="text-left">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Konto inaktiv</AlertTitle>
                        <AlertDescription>
                        Ihr Konto wurde von einem Administrator gesperrt. Sie können nicht auf Ihre Notizen zugreifen.
                        </AlertDescription>
                    </Alert>
                    )}

                    <Button onClick={handleLogout} variant="secondary" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Ausloggen
                    </Button>
                </div>
            )}
        </div>
      </main>
    );
  }
  
  // State 3: No user is logged in, show the login form
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center justify-center space-y-4">
          <KeepKnowLogo className="h-16 w-16 text-primary" />
          <h1 className="font-headline text-5xl font-bold tracking-tighter">
            Keep-Know
          </h1>
          <p className="text-muted-foreground">Focus, Organize, Succeed.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
