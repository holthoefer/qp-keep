
'use client';

import { getNotes, getUserProfile } from '@/lib/actions';
import { NoteList } from '@/components/notes/note-list';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import type { Note, UserProfile, UserProfileQueryResult } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [profileQueryResult, setProfileQueryResult] = useState<UserProfileQueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return; 
    }

    if (!user) {
      router.push('/');
      return;
    }

    async function loadUserData() {
      const profileResult = await getUserProfile(user!.uid);
      setProfileQueryResult(profileResult);
      
      const profile = profileResult.profile;

      if (profile && profile.status === 'active') {
        const userNotes = await getNotes(user!.uid);
        setNotes(userNotes);
      }
      
      setLoading(false);
    }

    loadUserData();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileQueryResult?.profile;

  if (!profile || profile.status !== 'active') {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to view this page. Your profile might be pending approval or suspended.
                    <pre className="mt-4 text-xs bg-black/80 text-white p-2 rounded-md overflow-x-auto">
                        <code>
                        {JSON.stringify({ profile, debug: profileQueryResult?.debug }, null, 2)}
                        </code>
                    </pre>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <NoteList notes={notes} userProfile={profile} />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
