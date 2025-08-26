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
  const [dataLoading, setDataLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return; // Wait for Firebase Auth to be initialized

    if (!user) {
      router.push('/'); // If no user, send to login page
      return;
    }

    // Since this layout is only for 'user' roles, we check for that.
    // Admins are routed to /admin by the AuthRedirector.
    async function loadUserData() {
      const profile = await getUserProfile(user!.uid);
      if (profile && (profile.role === 'user' || profile.role === 'admin') && profile.status === 'active') {
        setUserProfile(profile);
        const userNotes = await getNotes(user!.uid);
        setNotes(userNotes);
      } else {
        // If not an active user (or admin, who shouldn't be here), redirect.
        // This might happen if status changes while they are logged in.
        router.push('/');
      }
      setDataLoading(false);
    }

    loadUserData();
  }, [user, authLoading, router]);

  // Show a loader while authentication and data checks are in progress
  if (authLoading || dataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If all checks are passed, render the notes layout
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
