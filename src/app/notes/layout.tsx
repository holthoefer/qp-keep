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
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Wait until auth status is clear.
    }

    if (!user) {
      router.push('/'); // No user logged in, go to login page.
      return;
    }

    async function fetchData() {
      setDataLoading(true);
      try {
        const profile = await getUserProfile(user!.uid);
        
        if (profile && (profile.role === 'admin' || profile.status === 'active')) {
          // User is authorized to see notes.
          setUserProfile(profile);
          const userNotes = await getNotes(user!.uid);
          setNotes(userNotes);
        } else {
          // User is not authorized (pending, suspended, or no profile)
          router.push('/pending-approval');
        }
      } catch (error) {
          console.error("Failed to fetch user data:", error);
          router.push('/'); // On error, redirect to login
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading, router]);
  
  if (authLoading || dataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is done, but there's no profile, it means the user was redirected.
  // Rendering null prevents a brief flash of the UI.
  if (!userProfile) {
    return null;
  }

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
