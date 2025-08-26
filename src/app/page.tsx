'use client';

import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { AuthRedirector } from '@/components/auth/auth-redirector';

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // User is logged in, but we need to check their profile to redirect correctly.
    // This component will handle fetching the profile and redirecting.
    return <AuthRedirector user={user} />;
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
