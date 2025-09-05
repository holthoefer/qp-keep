

'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Shield, Book, Target, LayoutGrid, FolderKanban, BrainCircuit, LogOut, FileImage, Siren, Wrench } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getEvents, addEvent, deleteEvent, type Event } from '@/lib/data';
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
import { Timestamp } from 'firebase/firestore';

export default function EventsPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newEventDescription, setNewEventDescription] = React.useState('');
  
  const [itemToDelete, setItemToDelete] = React.useState<Event | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

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
        };
        await addEvent(eventData);
        toast({ title: 'Event erfasst' });
        setNewEventDescription('');
        setIsDialogOpen(false);
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

  if (loading || authLoading) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
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
        <div className="mx-auto w-full max-w-4xl">
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
                      Beschreiben Sie das Ereignis, das Sie festhalten möchten.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                     <Textarea 
                        id="description" 
                        placeholder="z.B. Maschine M-05 verliert Öl am Hauptgetriebe."
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        rows={5}
                     />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
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
                    <TableHead>Datum</TableHead>
                    <TableHead>Erfasser</TableHead>
                    <TableHead>Eventbeschreibung</TableHead>
                    {isAdmin && <TableHead className="text-right w-[100px]">Aktionen</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                    </TableRow>
                    ) : events.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center text-muted-foreground">
                        Keine Events gefunden.
                        </TableCell>
                    </TableRow>
                    ) : (
                    events.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>{item.eventDate ? format(item.eventDate.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A'}</TableCell>
                        <TableCell>{item.reporter}</TableCell>
                        <TableCell className="max-w-md">{item.description}</TableCell>
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
  );
}
