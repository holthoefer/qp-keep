
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2, Shield, ListChecks, Target, Book, LayoutGrid, FolderKanban, BrainCircuit, LogOut, FileImage } from 'lucide-react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getAuftraege,
  addAuftrag,
  updateAuftrag,
  deleteAuftrag,
  type Auftrag,
  getControlPlans,
  type ControlPlan,
} from '@/lib/data';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type AuftragFormData = Omit<Auftrag, 'id'>;

export default function POPage() {
  const auth = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Auftrag[]>([]);
  const [controlPlans, setControlPlans] = useState<ControlPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Auftrag | null>(null);
  const [formData, setFormData] = useState<AuftragFormData>({
    PO: '',
    CP: '',
    Anmerkung: '',
    imageUrl: '',
  });
  const { toast } = useToast();
  const isAdmin = auth.roles.includes('admin');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [auftraegeData, plans] = await Promise.all([
            getAuftraege(),
            getControlPlans()
        ]);
        setItems(auftraegeData);
        setControlPlans(plans);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(`Error loading items: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.user, auth.loading, router]);

  const handleLogout = async () => {
    await auth.logout();
    router.push('/');
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, field: keyof AuftragFormData) => {
    const value = typeof e === 'object' ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      if (editingItem) {
        // Can't change PO (the ID), so we can just use the full formData
        await updateAuftrag(editingItem.id, formData);
        toast({ title: 'Auftrag aktualisiert' });
      } else {
        await addAuftrag(formData);
        toast({ title: 'Auftrag hinzugefügt' });
      }
      setIsDialogOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Fehler beim Speichern', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (item: Auftrag) => {
    setEditingItem(item);
    setFormData({
        PO: item.PO,
        CP: item.CP || '',
        Anmerkung: item.Anmerkung || '',
        imageUrl: item.imageUrl || '',
    });
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingItem(null);
    setFormData({
        PO: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3,'0')}`,
        CP: '',
        Anmerkung: '',
        imageUrl: '',
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string | null) => {
    if (!isAdmin || !id) return;
    
    try {
        await deleteAuftrag(id);
        toast({ title: 'Auftrag gelöscht' });
    } catch (err) {
        console.error(err);
        toast({ title: 'Fehler beim Löschen', variant: 'destructive' });
    } finally {
        setItemToDelete(null);
    }
  }

  const handleRowClick = (item: Auftrag) => {
    router.push(`/auftraege/${item.PO}`);
  };

  if (loading || auth.loading) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Aufträge
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
             <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                DNA
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
                    <AvatarImage src={auth.user?.photoURL || undefined} alt={auth.user?.displayName || auth.user?.email || ''} />
                    <AvatarFallback>{auth.user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{auth.user?.email}</DropdownMenuLabel>
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
            <h2 className="font-headline text-2xl font-semibold">Auftragsliste</h2>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Neuer Auftrag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Auftrag bearbeiten' : 'Neuen Auftrag anlegen'}</DialogTitle>
                    <DialogDescription>
                      {editingItem ? `Änderungen für ${editingItem.PO} vornehmen.` : 'Füllen Sie die Details für den neuen Auftrag aus.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="PO">Auftragsnummer (PO)</Label>
                        <Input id="PO" value={formData.PO} onChange={(e) => handleFormChange(e, 'PO')} readOnly={!!editingItem} disabled={!!editingItem} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="CP">Control Plan (CP)</Label>
                        <Select value={formData.CP} onValueChange={(value) => handleFormChange(value, 'CP')}>
                            <SelectTrigger><SelectValue placeholder="Control Plan auswählen" /></SelectTrigger>
                            <SelectContent>
                                {controlPlans.map(plan => (
                                    <SelectItem key={plan.id} value={plan.planNumber}>{plan.planNumber} - {plan.partName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Anmerkung">Anmerkung</Label>
                        <Textarea id="Anmerkung" value={formData.Anmerkung} onChange={(e) => handleFormChange(e, 'Anmerkung')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input id="imageUrl" value={formData.imageUrl} onChange={(e) => handleFormChange(e, 'imageUrl')} />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Abbrechen</Button></DialogClose>
                    <Button onClick={handleSave}>Speichern</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftrags-Nr. (PO)</TableHead>
                  <TableHead>Control Plan</TableHead>
                  <TableHead>Anmerkung</TableHead>
                  {isAdmin && <TableHead className="text-right">Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4: 3} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4: 3} className="h-24 text-center text-muted-foreground">
                      Keine Aufträge gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                      <TableCell className="font-medium">{item.PO}</TableCell>
                      <TableCell>{item.CP}</TableCell>
                      <TableCell className="truncate max-w-xs">{item.Anmerkung}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Diese Aktion kann nicht rückgängig gemacht werden. Der Auftrag {item.PO} wird dauerhaft gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>Löschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}
