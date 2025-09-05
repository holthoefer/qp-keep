
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Shield, Book, Target, LayoutGrid, FolderKanban, BrainCircuit, LogOut, FileImage, Siren, Wrench, UploadCloud, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getEvents, addEvent, deleteEvent, type Event, getAppStorage, getWorkstations, type Workstation } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { ImageModal } from '@/components/cp/ImageModal';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { generateThumbnailUrl } from '@/lib/image-utils';
import NextImage from 'next/image';

export default function EventsPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [events, setEvents] = React.useState<Event[]>([]);
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newEventDescription, setNewEventDescription] = React.useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = React.useState('');
  const [selectedWorkstation, setSelectedWorkstation] = React.useState<Workstation | null>(null);
  
  const [itemToDelete, setItemToDelete] = React.useState<Event | null>(null);
  
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    
    async function loadData() {
        setLoading(true);
        try {
            const wsData = await getWorkstations();
            setWorkstations(wsData);
            
            const unsubscribe = getEvents(
              (newEvents) => {
                setEvents(newEvents);
                setError(null);
                setLoading(false);
              },
              (err) => {
                console.error(err);
                setError(`Error loading events: ${err.message}`);
                setLoading(false);
              }
            );
            return unsubscribe;

        } catch (err: any) {
            console.error(err);
            setError(`Error loading initial data: ${err.message}`);
            setLoading(false);
        }
    }

    const unsubscribePromise = loadData();
    
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
    };
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleAddEvent = async () => {
    if (!user || !newEventDescription.trim()) {
        toast({ title: 'Beschreibung darf nicht leer sein.', variant: 'destructive'});
        return;
    }

    try {
        const eventData: Omit<Event, 'id'> = {
            description: newEventDescription,
            eventDate: Timestamp.now(),
            reporter: user.displayName || user.email || 'Unbekannt',
            userId: user.uid,
            ...(selectedWorkstation && { 
                workplace: selectedWorkstation.AP,
                po: selectedWorkstation.POcurrent,
                op: selectedWorkstation.OPcurrent,
                lot: selectedWorkstation.LOTcurrent,
            }),
            ...(newAttachmentUrl && { attachmentUrl: newAttachmentUrl }),
        };
        await addEvent(eventData);
        toast({ title: 'Event erfasst' });
        resetDialog();
    } catch(e: any) {
        toast({ title: 'Fehler beim Speichern', description: e.message, variant: 'destructive' });
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteEvent(itemToDelete.id);
      toast({ title: 'Event gelöscht' });
    } catch (e: any) {
      toast({ title: 'Fehler beim Löschen', description: e.message, variant: 'destructive' });
    } finally {
      setItemToDelete(null);
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setNewEventDescription('');
    setNewAttachmentUrl('');
    setUploadError(null);
    setSelectedWorkstation(null);
  };

  const handleUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storage = getAppStorage();
    if (!storage) {
        setUploadError("Storage-Dienst ist nicht initialisiert.");
        setIsUploading(false);
        return;
    }
    const storageRef = ref(storage, `uploads/events/${Date.now()}_${file.name}`);
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
        setNewAttachmentUrl(downloadURL);
        setIsUploading(false);
        toast({ title: 'Upload erfolgreich', description: 'Die Datei wurde hochgeladen.' });
      }
    );
  };
  
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  if (loading || authLoading) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
    <>
    <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt="Event-Anhang"
    />
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Event-Liste
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                Notizen
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                WP
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/incidents')}>
                <Siren className="mr-2 h-4 w-4" />
                Status-Liste
            </Button>
             <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                DNA
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/PO')}>
                <FolderKanban className="mr-2 h-4 w-4" />
                PO
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
                <Button variant="outline" size="sm" onClick={() => router.push('/storage')}>
                  <FileImage className="mr-2 h-4 w-4" />
                  Storage
                </Button>
            )}
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                </Button>
            )}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
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
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline text-2xl font-semibold">Shopfloor Events</h2>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Neues Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Event erfassen</DialogTitle>
                    <DialogDescription>
                      Beschreiben Sie das Ereignis und ordnen Sie es ggf. einem Arbeitsplatz zu.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="workstation">Arbeitsplatz (optional)</Label>
                        <Select onValueChange={(ap) => setSelectedWorkstation(workstations.find(ws => ws.AP === ap) || null)}>
                            <SelectTrigger><SelectValue placeholder="Arbeitsplatz auswählen" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Kein Arbeitsplatz</SelectItem>
                                {workstations.map(ws => (
                                    <SelectItem key={ws.AP} value={ws.AP}>{ws.AP} - {ws.Beschreibung}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                     {selectedWorkstation && (
                        <div className="text-xs text-muted-foreground space-y-1 rounded-md border p-2 bg-muted">
                            <p><strong>Auftrag:</strong> {selectedWorkstation.POcurrent || 'N/A'}</p>
                            <p><strong>Prozess:</strong> {selectedWorkstation.OPcurrent || 'N/A'}</p>
                            <p><strong>Charge:</strong> {selectedWorkstation.LOTcurrent || 'N/A'}</p>
                        </div>
                     )}
                     <Textarea 
                        id="description" 
                        placeholder="z.B. Maschine M-05 verliert Öl am Hauptgetriebe."
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        rows={5}
                     />
                     <div className="space-y-2">
                        <Label htmlFor="attachment">Anhang (optional)</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                disabled={isUploading}
                                className="flex-shrink-0"
                            >
                                <UploadCloud className="mr-2 h-4 w-4" />
                                {isUploading ? `${Math.round(uploadProgress)}%` : 'Datei hochladen'}
                            </Button>
                            <Input
                                id="attachment"
                                value={newAttachmentUrl}
                                readOnly
                                placeholder="URL wird nach Upload angezeigt"
                                className="flex-grow bg-muted"
                            />
                        </div>
                        {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                        {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
                        <Input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.docx,.xlsx,.pptx"
                        />
                     </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetDialog}>Abbrechen</Button>
                    <Button onClick={handleAddEvent}>Speichern</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
           <AlertDialog>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Dieser Vorgang kann nicht rückgängig gemacht werden. Das Event wird dauerhaft gelöscht.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            <div className="rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Arbeitsplatz</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Erfasser</TableHead>
                    <TableHead>Eventbeschreibung</TableHead>
                    <TableHead>Anhang</TableHead>
                    <TableHead>Auftrag</TableHead>
                    <TableHead>Prozess</TableHead>
                    <TableHead>Charge</TableHead>
                    {isAdmin && <TableHead className="text-right w-[100px]">Aktionen</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : events.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-24 text-center text-muted-foreground">
                        Keine Events gefunden.
                        </TableCell>
                    </TableRow>
                    ) : (
                    events.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>{item.workplace || '-'}</TableCell>
                        <TableCell>{item.eventDate ? format(item.eventDate.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A'}</TableCell>
                        <TableCell>{item.reporter}</TableCell>
                        <TableCell className="max-w-md whitespace-pre-line line-clamp-3">{item.description}</TableCell>
                        <TableCell>
                            {item.attachmentUrl && (
                                isImage(item.attachmentUrl) ? (
                                    <button onClick={() => { setModalImageUrl(item.attachmentUrl!); setIsImageModalOpen(true); }}>
                                        <NextImage
                                            src={generateThumbnailUrl(item.attachmentUrl)}
                                            alt="Anhang Vorschau"
                                            width={40}
                                            height={40}
                                            className="rounded object-cover aspect-square"
                                        />
                                    </button>
                                ) : (
                                    <Button asChild variant="outline" size="icon">
                                        <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                            <LinkIcon className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )
                            )}
                        </TableCell>
                        <TableCell>{item.po || '-'}</TableCell>
                        <TableCell>{item.op || '-'}</TableCell>
                        <TableCell>{item.lot || '-'}</TableCell>
                        {isAdmin && (
                            <TableCell className="text-right">
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                            </TableCell>
                        )}
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </div>
           </AlertDialog>
        </div>
      </main>
    </div>
    </>
  );
}
