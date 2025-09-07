

'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth-context';
import { Loader2, LogOut, ShieldAlert, LayoutGrid, StickyNote, Wrench, Siren, Network, Target, Book, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { type UserProfile } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import logo from './Logo.png';
import Link from 'next/link';

export default function HomePage() {
  const { user, profile, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    await logout();
    router.refresh(); 
  };

  // State 1: AuthProvider handles the main loading state
  if (authLoading) {
    return null; // The AuthProvider will show a loading screen
  }

  // State 2: User is logged in
  if (user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
            <Link href="/qpinfo" aria-label="Zur Info-Seite">
                <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                    <Image src={logo} alt="qp Loop Logo" width={256} height={256} className="h-64 w-64 text-primary" />
                </div>
            </Link>
          
            <div className="space-y-4">
                <p className="font-medium">{user.email}</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        onClick={() => router.push('/arbeitsplaetze')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        Zu den Arbeitsplätzen
                    </Button>
                    <Button 
                        onClick={() => router.push('/dna')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <Network className="mr-2 h-4 w-4" />
                        DNA (Aktive Merkmale)
                    </Button>
                    <Button 
                        onClick={() => router.push('/events')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <Wrench className="mr-2 h-4 w-4" />
                        Zu den Events
                    </Button>
                    <Button 
                        onClick={() => router.push('/incidents')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <Siren className="mr-2 h-4 w-4" />
                        Zu den Incidents
                    </Button>
                     <Button 
                        onClick={() => router.push('/cp')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <Target className="mr-2 h-4 w-4" />
                        Control Plans {profile && !isAdmin && "(read only)"}
                    </Button>
                     <Button 
                        onClick={() => router.push('/lenkungsplan')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <Book className="mr-2 h-4 w-4" />
                        Plan-Ideen
                    </Button>
                    <Button 
                        onClick={() => router.push('/notes')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <StickyNote className="mr-2 h-4 w-4" />
                        Zur Notizenseite
                    </Button>
                     {isAdmin && (
                        <Button 
                            onClick={() => router.push('/admin/users')} 
                            className="w-full"
                            disabled={profile?.status === 'inactive'}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Button>
                    )}
                </div>

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
