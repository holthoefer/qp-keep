

'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Shield, Book, Target, LayoutGrid, FolderKanban, Network, LogOut, FileImage, Siren, Wrench, UploadCloud, Link as LinkIcon, Image as ImageIcon, MoreVertical, StickyNote, Edit, ArrowLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { getEvents, deleteEvent, type Event } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ImageModal } from '@/components/cp/ImageModal';
import { generateThumbnailUrl } from '@/lib/image-utils';
import NextImage from 'next/image';
import Image from 'next/image';
import logo from '../Logo.png';
import Link from 'next/link';

export default function EventsPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [itemToDelete, setItemToDelete] = React.useState<Event | null>(null);
  
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  
  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    
    async function loadData() {
        setLoading(true);
        try {
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

  const handleEdit = (item: Event) => {
    router.push(`/event/new?id=${item.id}`);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (!isAdmin) {
      toast({ title: 'Keine Berechtigung', description: 'Nur Administratoren können Events löschen.', variant: 'destructive'});
      return;
    }

    try {
      await deleteEvent(itemToDelete.id);
      toast({ title: 'Event gelöscht' });
    } catch (e: any) {
      toast({ title: 'Fehler beim Löschen', description: e.message, variant: 'destructive' });
    } finally {
      setItemToDelete(null);
    }
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
            <Link href="/" aria-label="Zur Startseite">
              <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
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
                <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                    <StickyNote className="mr-2 h-4 w-4" />
                    Notiz
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
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                    <StickyNote className="h-4 w-4" />
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
        <div className="flex items-center gap-2">
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
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => router.push('/notes')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-headline text-2xl font-semibold">Shopfloor Events</h2>
             </div>
            <Button onClick={() => router.push('/event/new')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Neues Event
            </Button>
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
                    <TableHead className="text-right w-[100px]">Aktionen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : events.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        Keine Events gefunden.
                        </TableCell>
                    </TableRow>
                    ) : (
                    events.map((item) => {
                      const isOwner = item.userId === user?.uid;
                      const canEdit = isAdmin || isOwner;
                      const canDelete = isAdmin;

                      return (
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
                        <TableCell className="text-right">
                          <div className='flex justify-end gap-1'>
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                            )}
                          </div>
                        </TableCell>
                        </TableRow>
                      )
                    })
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
