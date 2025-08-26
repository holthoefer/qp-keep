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
      return;
    }
    if (!user) {
      router.push('/');
      return;
    }

    async function fetchData() {
      setIsCheckingProfile(true);
      const profile = await getUserProfile(user!.uid);
      
      if (profile) {
        // Redirect based on role and status FIRST
        if (profile.role === 'admin') {
          router.push('/admin');
          return; 
        }
        if (profile.status !== 'active') {
          router.push('/pending-approval');
          return;
        }

        setUserProfile(profile);
        const userNotes = await getNotes(user!.uid);
        setNotes(userNotes);

      } else {
        // Profile doesn't exist yet, probably pending creation. Redirect.
        router.push('/pending-approval');
      }
      setIsCheckingProfile(false);
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

  // This content will only be rendered for 'active' 'user' roles.
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
