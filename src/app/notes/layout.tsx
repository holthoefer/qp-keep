'use client';

import { getNotes, getUserProfile } from '@/lib/actions';
import { NoteList } from '@/components/notes/note-list';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import type { Note, UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    if (loading) {
      return; // Wait for Firebase auth to be ready
    }
    if (!user) {
      router.push('/'); // Not logged in, go to login page
      return;
    }

    async function fetchData() {
      setIsCheckingProfile(true);
      try {
        const profile = await getUserProfile(user!.uid);
        
        if (profile) {
          // Profile exists, check role and status
          if (profile.role === 'admin') {
            setUserProfile(profile);
            const userNotes = await getNotes(user!.uid);
            setNotes(userNotes);
          } else if (profile.status === 'active') {
            setUserProfile(profile);
            const userNotes = await getNotes(user!.uid);
            setNotes(userNotes);
          } else {
            // User is pending or suspended
            router.push('/pending-approval');
          }
        } else {
          // Profile doesn't exist in Firestore yet.
          // This can happen for a brief moment after signup.
          // Redirecting to pending approval is a safe default.
          router.push('/pending-approval');
        }
      } catch (error) {
          console.error("Failed to fetch user data:", error);
          // Handle error case, maybe redirect to an error page or login
          router.push('/');
      } finally {
        setIsCheckingProfile(false);
      }
    }

    fetchData();
  }, [user, loading, router]);
  
  if (loading || isCheckingProfile || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // This content will only be rendered for 'active' users (admin or user).
  return (
    <SidebarProvider>
      <Sidebar>
        <NoteList notes={notes} userProfile={userProfile} />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
