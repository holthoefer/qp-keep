
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { addNote, getNotes, deleteNote, type Note, seedDatabaseWithExampleData, getProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trash2, Shield, ShieldAlert, UserCircle, ListChecks, Target, Database } from 'lucide-react';
import { KeepKnowLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';


export default function NotesPage() {
  const { user, roles, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [isSeeding, setIsSeeding] = useState(false);
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const fetchUserStatus = async () => {
        try {
            const userProfile = await getProfile(user.uid);
            if (userProfile) {
                setUserStatus(userProfile.status);
            }
        } catch (err) {
            console.error("Error fetching profile status:", err);
        }
    };
    
    fetchUserStatus();

    const unsubscribe = getNotes(user.uid, isAdmin,
      (newNotes) => {
        setNotes(newNotes);
        setError(null);
        setLoadingNotes(false);
      }, 
      (err) => {
        console.error(err);
        setError(`Fehler beim Laden der Notizen: ${err.message}. Bitte überprüfen Sie Ihre Firestore-Regeln und die Browser-Konsole für weitere Details.`);
        setLoadingNotes(false);
      }
    );
    return unsubscribe;
    
  }, [user, authLoading, router, isAdmin]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) {
      setError("Titel und Inhalt dürfen nicht leer sein.");
      return;
    }
    
    setIsSaving(true);
    setError(null);

    try {
      await addNote({
        userId: user.uid,
        userEmail: user.email!,
        title,
        content,
      });
      setTitle('');
      setContent('');
      toast({
        title: "Notiz gespeichert!",
        description: "Ihre Notiz wurde erfolgreich hinzugefügt und wird gerade getaggt.",
      })
    } catch (e) {
      console.error("Error saving note: ", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Fehler beim Speichern der Notiz: ${errorMessage}`);
      toast({
        title: "Fehler",
        description: `Notiz konnte nicht gespeichert werden. ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if(!user) return;
    try {
      await deleteNote(noteId);
      toast({
        title: "Notiz gelöscht!",
        description: "Die Notiz wurde entfernt.",
      })
    } catch (e) {
      console.error("Error deleting note: ", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Fehler beim Löschen der Notiz: ${errorMessage}`);
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht gelöscht werden.",
        variant: "destructive"
      })
    }
  }

  const handleSeedDatabase = async () => {
    if (!isAdmin) return;
    setIsSeeding(true);
    try {
      await seedDatabaseWithExampleData();
      toast({
        title: "Datenbank erfolgreich befüllt",
        description: "Zwei Beispiel-Control-Plans wurden der Datenbank hinzugefügt.",
      });
    } catch (error: any) {
       toast({
        title: "Fehler beim Befüllen der Datenbank",
        description: error.message,
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  }

  const isFormDisabled = isSaving || userStatus === 'inactive';

  if (authLoading || !user) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Keep-Know
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                <Target className="mr-2 h-4 w-4" />
                CP
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/controlplan')}>
                <ListChecks className="mr-2 h-4 w-4" />
                Control Plan
            </Button>
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                </Button>
            )}
             {isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleSeedDatabase} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Seed Database
                </Button>
            )}
          <p className="text-sm text-muted-foreground hidden sm:block">{user?.email}</p>
          <Button onClick={handleLogout} variant="secondary">
            Ausloggen
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="mx-auto w-full max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Neue Notiz erstellen</CardTitle>
            </CardHeader>
            <CardContent>
              {userStatus === 'inactive' ? (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Konto inaktiv</AlertTitle>
                  <AlertDescription>
                    Ihr Konto wurde von einem Administrator als inaktiv markiert. Sie können keine neuen Notizen erstellen oder bestehende bearbeiten.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSaveNote} className="space-y-4">
                  <Input
                    placeholder="Titel"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isFormDisabled}
                    className="font-headline"
                  />
                  <Textarea
                    placeholder="Schreiben Sie hier Ihre Notiz..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    disabled={isFormDisabled}
                  />
                  <div className="flex items-center justify-end">
                    <Button type="submit" disabled={isFormDisabled}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Speichern & Tags generieren
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-4 font-headline text-2xl font-semibold">
            {isAdmin ? 'Alle Notizen' : 'Meine Notizen'}
          </h2>
           {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          <div className="grid gap-4">
            {loadingNotes ? (
                 <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : notes.length === 0 && !error ? (
              <p className="text-muted-foreground text-center">Sie haben noch keine Notizen. Erstellen Sie Ihre erste!</p>
            ) : (
              notes.map((note) => (
                <Card key={note.id} className={isAdmin && note.userId !== user.uid ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{note.title}</CardTitle>
                             <div className="text-xs text-muted-foreground pt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span>{note.createdAt?.toDate().toLocaleString('de-DE')}</span>
                                {isAdmin && note.userId !== user.uid && (
                                    <>
                                        <span className="hidden sm:inline-block">•</span>
                                        <div className="flex items-center gap-1 font-medium text-primary">
                                          <UserCircle className="h-3 w-3" />
                                          <span>{note.userEmail || 'Unbekannt'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteNote(note.id)}
                            // Admins cannot delete other users' notes from this view.
                            disabled={userStatus === 'inactive' || (isAdmin && note.userId !== user.uid)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                  {note.tags && note.tags.length > 0 && (
                    <CardFooter className="flex-wrap gap-2 pt-4">
                      {note.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </CardFooter>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
