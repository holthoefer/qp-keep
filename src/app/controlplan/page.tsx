
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    getProfile,
    type UserProfile,
    getControlPlanItems,
    addControlPlanItem,
    updateControlPlanItem,
    deleteControlPlanItem,
    type ControlPlanItem,
} from '@/lib/data';
import { ControlPlanStatus } from '@/types';

type ControlPlanItemFormData = Omit<ControlPlanItem, 'id' | 'createdAt'>;

export default function ControlPlanPage() {
  const { user, roles, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ControlPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ControlPlanItem | null>(null);
  const [formData, setFormData] = useState<ControlPlanItemFormData>({
    partName: '',
    responsible: '',
    status: 'Draft',
    planNumber: '',
    partNumber: '',
    version: 1,
  });
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const unsubscribe = getControlPlanItems(
          (newItems) => {
            setItems(newItems);
            setError(null);
          },
          (err) => {
            console.error(err);
            setError(`Error loading items: ${err.message}`);
          }
        );
        setLoading(false);
        return unsubscribe;
      } catch (err) {
        console.error(err);
        setError('Failed to load data.');
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchData();

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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement> | string | number, field: keyof ControlPlanItemFormData) => {
    const value = typeof e === 'object' ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      if (editingItem) {
        await updateControlPlanItem(editingItem.id, formData);
        toast({ title: 'Plan Updated' });
      } else {
        await addControlPlanItem(formData);
        toast({ title: 'Plan Added' });
      }
      setIsDialogOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error saving item', variant: 'destructive' });
    }
  };

  const openEditDialog = (item: ControlPlanItem) => {
    setEditingItem(item);
    setFormData({
        partName: item.partName,
        responsible: item.responsible,
        status: item.status,
        planNumber: item.planNumber,
        partNumber: item.partNumber,
        version: item.version,
    });
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingItem(null);
    setFormData({
        partName: '',
        responsible: '',
        status: 'Draft',
        planNumber: `CP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3,'0')}`,
        partNumber: '',
        version: 1,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string | null) => {
    if (!isAdmin || !id) return;
    
    try {
        await deleteControlPlanItem(id);
        toast({ title: 'Item Deleted' });
    } catch (err) {
        console.error(err);
        toast({ title: 'Error deleting item', variant: 'destructive' });
    } finally {
        setItemToDelete(null);
    }
  }

  if (loading || authLoading) {
    return null; // AuthProvider shows LoadingScreen
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Control Plan
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
            Back to Notes
          </Button>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline text-2xl font-semibold">Plans</h2>
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNewDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Neuer Control Plan
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Edit Control Plan' : 'Neuen Control Plan anlegen'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="planNumber" className="text-right">Plan-Nummer</Label>
                                    <Input id="planNumber" value={formData.planNumber} onChange={(e) => handleFormChange(e, 'planNumber')} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="partName" className="text-right">Teile-Name</Label>
                                    <Input id="partName" value={formData.partName} onChange={(e) => handleFormChange(e, 'partName')} className="col-span-3" />
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="partNumber" className="text-right">Teile-Nummer</Label>
                                    <Input id="partNumber" value={formData.partNumber} onChange={(e) => handleFormChange(e, 'partNumber')} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="responsible" className="text-right">Verantwortlich</Label>
                                    <Input id="responsible" value={formData.responsible} onChange={(e) => handleFormChange(e, 'responsible')} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="version" className="text-right">Version</Label>
                                    <Input id="version" type="number" value={formData.version} onChange={(e) => handleFormChange(Number(e.target.value), 'version')} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right">Status</Label>
                                    <Select value={formData.status} onValueChange={(value: ControlPlanStatus) => handleFormChange(value, 'status')}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                             {Object.values(ControlPlanStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                <Button variant="outline">Abbrechen</Button>
                                </DialogClose>
                                <Button onClick={handleSave}>Speichern</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the control plan item.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(itemToDelete)}>
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan-Nummer</TableHead>
                  <TableHead>Teile-Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  {isAdmin && <TableHead className="text-right">Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6: 5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 6: 5} className="h-24 text-center text-muted-foreground">
                            Keine Pläne gefunden.
                        </TableCell>
                    </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.planNumber}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell>{item.version}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'Active' || item.status === 'Approved' ? 'default' : 'secondary'}>
                            {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.createdAt?.toDate().toLocaleDateString('de-DE')}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                <Edit className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
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
