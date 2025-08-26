
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export function AuthRedirector({ user }: { user: User }) {
  const router = useRouter();

  useEffect(() => {
    // We have a user, so we always redirect to the central dashboard.
    // The dashboard will then handle logic based on the user's profile.
    router.push('/dashboard');
  }, [user, router]);

  // Display a full-screen loader while the redirection is happening.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
