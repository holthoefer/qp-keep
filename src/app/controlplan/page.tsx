
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
    task: '',
    responsible: '',
    status: 'pending',
  });
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');

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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement> | string, field: keyof ControlPlanItemFormData) => {
    const value = typeof e === 'string' ? e : e.target.value;
     setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      if (editingItem) {
        await updateControlPlanItem(editingItem.id, formData);
        toast({ title: 'Item Updated' });
      } else {
        await addControlPlanItem(formData);
        toast({ title: 'Item Added' });
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
        task: item.task,
        responsible: item.responsible,
        status: item.status,
    });
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingItem(null);
    setFormData({
        task: '',
        responsible: '',
        status: 'pending',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteControlPlanItem(id);
            toast({ title: 'Item Deleted' });
        } catch (err) {
            console.error(err);
            toast({ title: 'Error deleting item', variant: 'destructive' });
        }
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
            <h2 className="font-headline text-2xl font-semibold">Tasks</h2>
            {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewDialog}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="task" className="text-right">Task</Label>
                                <Input id="task" value={formData.task} onChange={(e) => handleFormChange(e, 'task')} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="responsible" className="text-right">Responsible</Label>
                                <Input id="responsible" value={formData.responsible} onChange={(e) => handleFormChange(e, 'responsible')} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Status</Label>
                                <Select value={formData.status} onValueChange={(value) => handleFormChange(value, 'status')}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleSave}>Save</Button>
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
                  <TableHead>Task</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5: 4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={isAdmin ? 5: 4} className="h-24 text-center text-muted-foreground">
                            No tasks found.
                        </TableCell>
                    </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.task}</TableCell>
                      <TableCell>{item.responsible}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                            {item.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.createdAt?.toDate().toLocaleDateString('de-DE')}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                <Edit className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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
