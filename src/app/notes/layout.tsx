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
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Warten, bis der Auth-Status klar ist.
    }

    if (!user) {
      router.push('/'); // Kein Benutzer angemeldet, zur Login-Seite.
      return;
    }

    // Wenn ein Benutzer angemeldet ist, holen wir sein Profil.
    async function fetchData() {
      setIsCheckingProfile(true);
      try {
        const profile = await getUserProfile(user!.uid);
        
        if (profile && (profile.role === 'admin' || profile.status === 'active')) {
          // Benutzer ist Admin oder aktiv. Er darf bleiben.
          setUserProfile(profile);
          const userNotes = await getNotes(user!.uid);
          setNotes(userNotes);
        } else {
          // Benutzer ist nicht berechtigt (pending, suspended, kein Profil)
          router.push('/pending-approval');
        }
      } catch (error) {
          console.error("Failed to fetch user data:", error);
          router.push('/'); // Im Fehlerfall zur Login-Seite
      } finally {
        setIsCheckingProfile(false); // Profil-Prüfung ist abgeschlossen
      }
    }

    fetchData();
  }, [user, authLoading, router]);
  
  if (authLoading || isCheckingProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Wenn die Prüfung abgeschlossen ist, aber kein Profil gesetzt wurde,
  // bedeutet das, der Benutzer wurde bereits weitergeleitet. 
  // Das Anzeigen von 'null' verhindert ein kurzes Aufblitzen der alten UI.
  if (!userProfile) {
    return null;
  }

  // Dieser Inhalt wird nur für 'active' oder 'admin' Benutzer gerendert.
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
