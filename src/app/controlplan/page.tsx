
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
    getControlPlanItems,
    addControlPlanItem,
    updateControlPlanItem,
    deleteControlPlanItem,
    type ControlPlanItem,
} from '@/lib/data';
import { ControlPlanStatus } from '@/types';
import { Textarea } from '@/components/ui/textarea';

type ControlPlanItemFormData = Omit<ControlPlanItem, 'id' | 'createdAt'>;

const formatDateForInput = (date?: string | Date | null): string => {
  if (!date) return '';
  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) return '';
    // Format to YYYY-MM-DD
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};


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
    planDescription: '',
    keyContact: '',
    revisionDate: new Date().toISOString().split('T')[0],
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | number, field: keyof ControlPlanItemFormData) => {
    const value = typeof e === 'object' ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      if (editingItem) {
        // When updating, we use the item's ID (which is the planNumber)
        // We only pass the fields that can be changed.
        const { planNumber, ...updateData } = formData;
        await updateControlPlanItem(editingItem.id, updateData);
        toast({ title: 'Plan Updated' });
      } else {
        await addControlPlanItem(formData);
        toast({ title: 'Plan Added' });
      }
      setIsDialogOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error saving item', description: err.message, variant: 'destructive' });
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
        planDescription: item.planDescription || '',
        keyContact: item.keyContact || '',
        revisionDate: formatDateForInput(item.revisionDate),
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
        planDescription: '',
        keyContact: '',
        revisionDate: new Date().toISOString().split('T')[0],
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
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Edit Control Plan' : 'Neuen Control Plan anlegen'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="planNumber">Plan-Nummer</Label>
                                        <Input 
                                          id="planNumber" 
                                          value={formData.planNumber} 
                                          onChange={(e) => handleFormChange(e, 'planNumber')} 
                                          readOnly={!!editingItem}
                                          disabled={!!editingItem}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="partName">Teile-Name</Label>
                                        <Input id="partName" value={formData.partName} onChange={(e) => handleFormChange(e, 'partName')} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="partNumber">Teile-Nummer</Label>
                                        <Input id="partNumber" value={formData.partNumber} onChange={(e) => handleFormChange(e, 'partNumber')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="responsible">Verantwortlich</Label>
                                        <Input id="responsible" value={formData.responsible} onChange={(e) => handleFormChange(e, 'responsible')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="keyContact">Key Contact</Label>
                                        <Input id="keyContact" value={formData.keyContact || ''} onChange={(e) => handleFormChange(e, 'keyContact')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select value={formData.status} onValueChange={(value: ControlPlanStatus) => handleFormChange(value, 'status')}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                 {Object.values(ControlPlanStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="version">Version</Label>
                                        <Input id="version" type="number" value={formData.version} onChange={(e) => handleFormChange(Number(e.target.value), 'version')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="revisionDate">Revision Date</Label>
                                        <Input id="revisionDate" type="date" value={formData.revisionDate || ''} onChange={(e) => handleFormChange(e, 'revisionDate')} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="planDescription">Plan Description</Label>
                                    <Textarea id="planDescription" value={formData.planDescription || ''} onChange={(e) => handleFormChange(e, 'planDescription')} />
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
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the plan {item.planNumber}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                        Delete
                                        </AlertDialogAction>
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

    