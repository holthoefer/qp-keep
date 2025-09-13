

'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Book, Target, LayoutGrid, FolderKanban, Network, LogOut, FileImage, Siren, Edit, Trash2, Wrench, StickyNote, ArrowLeft, MoreVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getIncidents, deleteIncident, type Incident } from '@/lib/data';
import { format } from 'date-fns';
import Image from 'next/image';
import logo from '../Logo.png';
import Link from 'next/link';

export default function IncidentsPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = React.useState<Incident | null>(null);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const unsubscribe = getIncidents(
      (newIncidents) => {
        setIncidents(newIncidents);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(`Error loading incidents: ${err.message}`);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, authLoading, router]);
  
  const handleDelete = async (incidentId: string) => {
    if (!isAdmin) return;
    try {
      await deleteIncident(incidentId);
      toast({ title: 'Incident gelöscht' });
      // The onSnapshot listener in getIncidents will update the state automatically
    } catch(e: any) {
      toast({ title: 'Fehler beim Löschen', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = (incident: Incident) => {
    router.push(`/incident?id=${incident.id}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || authLoading) {
    return null; // AuthProvider shows LoadingScreen
  }

  const priorityVariant = {
    Niedrig: 'secondary',
    Mittel: 'default',
    Hoch: 'destructive',
    Kritisch: 'destructive',
  } as const;

  return (
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
                <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Events
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
             {/* Mobile View: Icons and Dropdown */}
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
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/events')}>
                    <Wrench className="h-4 w-4" />
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
                <h2 className="font-headline text-2xl font-semibold">Incident-Liste</h2>
            </div>
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
                  Dieser Vorgang kann nicht rückgängig gemacht werden. Der Incident "{itemToDelete?.title}" wird dauerhaft gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete.id)}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arbeitsplatz</TableHead>
                    <TableHead>Gemeldet am</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Priorität</TableHead>
                    <TableHead>Gemeldet von</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Keine Incidents gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidents.map((item) => {
                        const canEdit = isAdmin || item.reportedBy.uid === user?.uid;
                        const canDelete = isAdmin;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.workplace}</TableCell>
                            <TableCell>{item.reportedAt ? format(item.reportedAt.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A'}</TableCell>
                            <TableCell className="font-medium truncate max-w-xs">{item.title}</TableCell>
                            <TableCell>
                              <Badge variant={priorityVariant[item.priority]}>{item.priority}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{item.reportedBy.email}</TableCell>
                            <TableCell>{item.team}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
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
  );
}
