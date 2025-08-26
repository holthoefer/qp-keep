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
      // This should not happen, but as a safeguard.
      if (!user) {
        router.push('/');
        return;
      }

      // Fetch the user's profile from Firestore.
      const profile = await getUserProfile(user.uid);

      if (profile) {
        if (profile.role === 'admin') {
          router.push('/admin');
        } else if (profile.status === 'active') {
          router.push('/notes');
        } else {
          // Handles 'pending_approval' or 'suspended'
          router.push('/pending-approval');
        }
      } else {
        // This can happen if the Firestore document creation failed or is delayed.
        // Directing to pending-approval is a safe fallback. The user can try logging in again later.
        router.push('/pending-approval');
      }
    }

    checkProfileAndRedirect();
  }, [user, router]);

  // Display a full-screen loader while the profile is being checked and redirection is happening.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
