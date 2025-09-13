

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { addNote, getNotes, deleteNote, type Note, getAppStorage } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trash2, Shield, ShieldAlert, UserCircle, ListChecks, Target, Book, LayoutGrid, FolderKanban, Network, LogOut, FileImage, Siren, Wrench, StickyNote, MoreVertical, UploadCloud, ImageIcon, Link as LinkIcon, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NextImage from 'next/image';
import logo from '../Logo.png';
import Link from 'next/link';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { ImageModal } from '@/components/cp/ImageModal';
import { generateThumbnailUrl } from '@/lib/image-utils';


export default function NotesPage() {
  const { user, profile, roles, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);
  
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

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
    
    const agentMessage = searchParams.get('message');
    if (agentMessage) {
        setTitle('Agent😎');
        setContent(agentMessage);
    }

    return unsubscribe;
    
  }, [user, authLoading, router, isAdmin, searchParams]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const clearAttachment = () => {
    setAttachmentUrl('');
    setJustUploaded(false);
    if(attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
    }
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
        attachmentUrl,
      });
      setTitle('');
      setContent('');
      clearAttachment();
      toast({
        title: "Notiz gespeichert!",
        description: "Ihre Notiz wurde erfolgreich hinzugefügt und wird gerade getaggt.",
      })
    } catch (e) {
      console.error("Error saving note: ", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
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
      toast({
        title: "Fehler",
        description: `Notiz konnte nicht gelöscht werden. ${errorMessage}`,
        variant: "destructive"
      })
    }
  }
  
  const handleUpload = (file: File) => {
    if (!user) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storage = getAppStorage();
    if (!storage) {
      setUploadError("Storage-Dienst ist nicht initialisiert.");
      setIsUploading(false);
      return;
    }

    const storageRef = ref(storage, `uploads/notes/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload Error:', error);
        setUploadError('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setAttachmentUrl(downloadURL);
        setJustUploaded(true);
        setIsUploading(false);
        toast({ title: 'Upload erfolgreich', description: 'Die Datei ist bereit zum Speichern.' });
      }
    );
  };
  
  const isImage = (url: string): boolean => {
    if (!url) return false;
    // Check based on common image file extensions
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split('?')[0]);
  };

  const isFormDisabled = isSaving || profile?.status === 'inactive' || isUploading;

  if (authLoading || !user) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
    <>
      <ImageModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        imageUrl={modalImageUrl}
        imageAlt="Notizbild"
      />
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
              <Link href="/" aria-label="Zur Startseite">
                <NextImage src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
              </Link>
              <div className="hidden md:flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      WP
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                      <Network className="mr-2 h-4 w-4" />
                      DNA
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/PO')}>
                      <FolderKanban className="mr-2 h-4 w-4" />
                      PO
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                      <Wrench className="mr-2 h-4 w-4" />
                      Events
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/incidents')}>
                      <Siren className="mr-2 h-4 w-4" />
                      Incidents
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                      <Target className="mr-2 h-4 w-4" />
                      CP
                  </Button>
                   <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                        <Book className="mr-2 h-4 w-4" />
                        LP
                    </Button>
                  {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                      </Button>
                  )}
              </div>
              <div className="md:hidden flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/arbeitsplaetze')}>
                      <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/dna')}>
                      <Network className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/PO')}>
                      <FolderKanban className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/events')}>
                      <Wrench className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/incidents')}>
                      <Siren className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/cp')}>
                      <Target className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push('/lenkungsplan')}>
                          <Book className="mr-2 h-4 w-4" />
                          <span>LP</span>
                      </DropdownMenuItem>
                      {isAdmin && <DropdownMenuSeparator />}
                      {isAdmin && (
                          <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                              <Shield className="mr-2 h-4 w-4" />
                              <span>Admin</span>
                          </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
                    <Avatar>
                      <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || ''} />
                      <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Ausloggen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="mx-auto w-full max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-headline">Neue Notiz erstellen</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.status === 'inactive' ? (
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
                     {isUploading && <Progress value={uploadProgress} className="mt-2 w-full" />}
                     {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
                    
                    <div className="flex justify-between items-end gap-4">
                      <div className="space-y-2">
                        {!attachmentUrl && (
                          <Button
                            type="button"
                            onClick={() => attachmentInputRef.current?.click()}
                            variant="outline"
                            disabled={isUploading}
                          >
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Foto/Datei
                          </Button>
                        )}
                        {attachmentUrl && isImage(attachmentUrl) && (
                          <div className="relative w-32 h-32">
                            <NextImage src={justUploaded ? attachmentUrl : generateThumbnailUrl(attachmentUrl)} alt="Vorschau" fill className="rounded-md object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={clearAttachment}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                         {attachmentUrl && !isImage(attachmentUrl) && (
                           <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                                <File className="h-6 w-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground truncate max-w-xs">{attachmentUrl.split('/').pop()?.split('?')[0]}</span>
                                <Button type="button" variant="ghost" size="icon" onClick={clearAttachment} className="h-6 w-6"><Trash2 className="h-3 w-3" /></Button>
                           </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <Button type="submit" disabled={isFormDisabled} size="lg">
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sichern+Tags
                        </Button>
                      </div>
                    </div>
                    <Input
                        type="file"
                        ref={attachmentInputRef}
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        className="hidden"
                        disabled={isUploading}
                        accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <h2 className="mb-4 font-headline text-xl font-semibold">
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
                              <CardTitle className="text-xl">{note.title}</CardTitle>
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
                              disabled={profile?.status === 'inactive' || (isAdmin && note.userId !== user.uid)}
                          >
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                    </CardContent>
                    {(note.tags && note.tags.length > 0) || note.attachmentUrl ? (
                      <CardFooter className="flex-wrap gap-2 pt-4 justify-between items-end">
                        <div className="flex flex-wrap gap-2 items-center">
                            {note.tags?.map(tag => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                        </div>
                        {note.attachmentUrl && (
                             isImage(note.attachmentUrl) ? (
                                <button onClick={() => { setModalImageUrl(note.attachmentUrl!); setIsModalOpen(true); }} className="block">
                                    <NextImage
                                        src={generateThumbnailUrl(note.attachmentUrl)}
                                        alt="Notiz-Anhang"
                                        width={48}
                                        height={48}
                                        className="rounded object-cover aspect-square border"
                                    />
                                </button>
                             ) : (
                                <Button asChild variant="outline" size="sm">
                                    <a href={note.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        Anhang
                                    </a>
                                </Button>
                             )
                        )}
                      </CardFooter>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
