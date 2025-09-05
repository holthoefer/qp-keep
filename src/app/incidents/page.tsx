

'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Book, Target, LayoutGrid, FolderKanban, BrainCircuit, LogOut, FileImage, Siren, Edit, Trash2, Wrench } from 'lucide-react';
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
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Incidents
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
            <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                <Wrench className="mr-2 h-4 w-4" />
                Events
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
            <h2 className="font-headline text-2xl font-semibold">Incident-Liste</h2>
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
                    {isAdmin && <TableHead className="text-right">Aktionen</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                        Keine Incidents gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidents.map((item) => (
                      <TableRow key={item.id} onClick={() => handleEdit(item)} className="cursor-pointer">
                        <TableCell>{item.workplace}</TableCell>
                        <TableCell>{item.reportedAt ? format(item.reportedAt.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A'}</TableCell>
                        <TableCell className="font-medium truncate max-w-xs">{item.title}</TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant[item.priority]}>{item.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{item.reportedBy.email}</TableCell>
                        <TableCell>{item.team}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
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
