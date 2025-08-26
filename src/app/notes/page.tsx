
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { addNote, getNotes, deleteNote, type Note } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';
import { KeepKnowLogo } from '@/components/icons';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const unsubscribe = getNotes(user.uid, setNotes, setLoadingNotes);
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (newContent.length > 50 && !isTagging) {
      setIsTagging(true);
      try {
        const result = await suggestTags({ noteContent: newContent });
        setSuggestedTags(result.tags);
      } catch (e) {
        console.error("Error suggesting tags:", e);
      } finally {
        setIsTagging(false);
      }
    }
  }

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
        title,
        content,
        tags: suggestedTags
      });
      setTitle('');
      setContent('');
      setSuggestedTags([]);
      toast({
        title: "Notiz gespeichert!",
        description: "Ihre Notiz wurde erfolgreich hinzugefügt.",
      })
    } catch (e) {
      console.error("Error saving note: ", e);
      setError("Fehler beim Speichern der Notiz.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast({
        title: "Notiz gelöscht!",
        variant: "destructive",
      })
    } catch (e) {
      console.error("Error deleting note: ", e);
      setError("Fehler beim Löschen der Notiz.");
    }
  }

  if (authLoading || loadingNotes) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
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
              <CardDescription>Erfassen Sie Ihre Gedanken und Ideen.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNote} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Input
                  placeholder="Titel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSaving}
                />
                <Textarea
                  placeholder="Schreiben Sie hier Ihre Notiz..."
                  value={content}
                  onChange={handleContentChange}
                  rows={6}
                  disabled={isSaving}
                />
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {isTagging && <Loader2 className="animate-spin text-primary" size={16} />}
                      {suggestedTags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Speichern
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <h2 className="mb-4 font-headline text-2xl font-semibold">Meine Notizen</h2>
          <div className="grid gap-4">
            {notes.length === 0 ? (
              <p className="text-muted-foreground">Sie haben noch keine Notizen.</p>
            ) : (
              notes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{note.title}</CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">
                                {note.createdAt?.toDate().toLocaleDateString('de-DE')}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                     <div className="flex gap-2 flex-wrap mt-4">
                      {note.tags?.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
