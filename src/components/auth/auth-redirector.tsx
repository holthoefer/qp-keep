'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { getUserProfile } from '@/lib/actions';
import { Loader2 } from 'lucide-react';

export function AuthRedirector({ user }: { user: User }) {
  const router = useRouter();

  useEffect(() => {
    async function checkProfileAndRedirect() {
      if (!user) {
        router.push('/');
        return;
      }

      const profile = await getUserProfile(user.uid);

      if (profile) {
        if (profile.role === 'admin') {
          router.push('/admin');
        } else if (profile.status === 'active') {
          router.push('/notes');
        } else {
          router.push('/pending-approval');
        }
      } else {
        // No profile found in Firestore, should not happen with correct signup flow,
        // but as a fallback, we direct to pending.
        router.push('/pending-approval');
      }
    }

    checkProfileAndRedirect();
  }, [user, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
