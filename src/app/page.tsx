'use client';

import { LoginForm } from '@/components/auth/login-form';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getUserProfile } from '@/lib/actions';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      const checkUserStatusAndRedirect = async () => {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          if (profile.status === 'pending_approval') {
            router.push('/pending-approval');
          } else if (profile.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/notes');
          }
        }
      };
      checkUserStatusAndRedirect();
    }
  }, [user, loading, router]);

  // Show loader while checking auth state or if user object exists but redirect hasn't happened
  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show the login form if not loading and no user is found
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
