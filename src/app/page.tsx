
'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth-context';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { type UserProfile } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import logo from './Logo.png';

export default function HomePage() {
  const { user, profile, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
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

  // State 2: User is logged in
  if (user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
            <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                <Image src={logo} alt="qp Loop Logo" width={128} height={128} className="h-32 w-32 text-primary" />
                <h1 className="font-headline text-3xl font-bold tracking-tighter">
                    qp
                </h1>
            </div>
          
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
        </div>
      </main>
    );
  }
  
  // State 3: No user is logged in, show the login form
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <Image src={logo} alt="QuaPilot Logo" width={48} height={48} className="h-12 w-12" />
            <h1 className="font-headline text-4xl font-bold tracking-tighter">
              QuaPilot (qp)
            </h1>
          </div>
          <p className="text-muted-foreground">Loop-in Notizen und Stichproben</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
