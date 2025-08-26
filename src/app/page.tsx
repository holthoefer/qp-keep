
'use client';

import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    // The useAuth hook will handle the user state change and redirect.
  };

  const goToNotes = () => {
    router.push('/notes');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    );
  }

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
          
            <div className="space-y-4">
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">E-Mail verifiziert: {user.emailVerified ? 'Ja' : 'Nein'}</p>
                <Button onClick={goToNotes} className="w-full">
                    Zur Notizenseite
                </Button>
                <Button onClick={handleLogout} variant="secondary" className="w-full">
                    <LogOut className="mr-2" />
                    Ausloggen
                </Button>
            </div>
        </div>
      </main>
    );
  }
  
  // If not loading and no user, show the login form.
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
