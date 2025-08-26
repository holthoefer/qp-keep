
'use client';

import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HomePage() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

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
          <div className="w-full max-w-sm space-y-8">
            <div>
                <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                <KeepKnowLogo className="h-16 w-16 text-primary" />
                <h1 className="font-headline text-5xl font-bold tracking-tighter">
                    Willkommen!
                </h1>
                </div>

                <Card>
                <CardHeader>
                    <CardTitle>Angemeldet</CardTitle>
                    <CardDescription>Sie sind erfolgreich angemeldet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center font-medium">{user.email}</p>
                    <p className="text-center text-sm text-muted-foreground">
                        E-Mail verifiziert: {user.emailVerified ? 'Ja' : 'Nein'}
                    </p>
                    <Button onClick={handleLogout} className="w-full" variant="secondary">
                        Ausloggen
                    </Button>
                </CardContent>
                </Card>
            </div>
          </div>
       </main>
    )
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
