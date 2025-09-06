

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2, Shield, ListChecks, Target, Book, LayoutGrid, FolderKanban, Network, LogOut, FileImage, Wrench, Siren, StickyNote, ArrowLeft } from 'lucide-react';
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
    getLenkungsplanItems,
    addLenkungsplanItem,
    updateLenkungsplanItem,
    deleteLenkungsplanItem,
    type ControlPlanItem,
} from '@/lib/data';
import { ControlPlanStatus } from '@/types';
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
import Image from 'next/image';
import logo from '../Logo.png';


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


export default function LenkungsplanPage() {
  const { user, roles, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ControlPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ControlPlanItem | null>(null);
  const [formData, setFormData] = useState<ControlPlanItemFormData>({
    partName: '',
    status: 'Draft',
    planNumber: '',
    partNumber: '',
    version: 1,
    revisionDate: new Date().toISOString().split('T')[0],
    planDescription: '',
    keyContact: '',
    supplierPlant: '',
    supplierCode: '',
    coreTeam: '',
    plantApprovalDate: '',
    otherApproval: '',
    originalFirstDate: '',
    customerEngineeringApprovalDate: '',
    customerQualityApprovalDate: '',
    otherApprovalDate: '',
    generalInformation: '',
    imageUrl: '',
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
        const unsubscribe = getLenkungsplanItems(
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
        await updateLenkungsplanItem(editingItem.id, updateData);
        toast({ title: 'Plan Updated' });
      } else {
        await addLenkungsplanItem(formData);
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
        status: item.status,
        planNumber: item.planNumber,
        partNumber: item.partNumber,
        version: item.version,
        revisionDate: formatDateForInput(item.revisionDate),
        planDescription: item.planDescription || '',
        keyContact: item.keyContact || '',
        supplierPlant: item.supplierPlant || '',
        supplierCode: item.supplierCode || '',
        coreTeam: item.coreTeam || '',
        plantApprovalDate: formatDateForInput(item.plantApprovalDate) || '',
        otherApproval: item.otherApproval || '',
        originalFirstDate: formatDateForInput(item.originalFirstDate) || '',
        customerEngineeringApprovalDate: formatDateForInput(item.customerEngineeringApprovalDate) || '',
        customerQualityApprovalDate: formatDateForInput(item.customerQualityApprovalDate) || '',
        otherApprovalDate: formatDateForInput(item.otherApprovalDate) || '',
        generalInformation: item.generalInformation || '',
        imageUrl: item.imageUrl || '',
    });
    setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingItem(null);
    setFormData({
        partName: '',
        status: 'Draft',
        planNumber: `LP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3,'0')}`,
        partNumber: '',
        version: 1,
        revisionDate: new Date().toISOString().split('T')[0],
        planDescription: '',
        keyContact: '',
        supplierPlant: '',
        supplierCode: '',
        coreTeam: '',
        plantApprovalDate: '',
        otherApproval: '',
        originalFirstDate: new Date().toISOString().split('T')[0],
        customerEngineeringApprovalDate: '',
        customerQualityApprovalDate: '',
        otherApprovalDate: '',
        generalInformation: '',
        imageUrl: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string | null) => {
    if (!isAdmin || !id) return;
    
    try {
        await deleteLenkungsplanItem(id);
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
          <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="font-headline text-xl font-bold tracking-tighter text-foreground">
            qp
          </h1>
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
                <Button variant="outline" size="sm" onClick={() => router.push('/incidents')}>
                    <Siren className="mr-2 h-4 w-4" />
                    Incidents
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                    <Target className="mr-2 h-4 w-4" />
                    CP
                </Button>
                {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                    </Button>
                )}
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
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => router.push('/notes')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-headline text-2xl font-semibold">Pläne</h2>
            </div>
            <div className="flex items-center gap-2">
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNewDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Neuer Lenkungsplan
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Lenkungsplan bearbeiten' : 'Neuen Lenkungsplan anlegen'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="grid md:grid-cols-3 gap-4">
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
                                        <Label htmlFor="supplierPlant">Supplier/Plant</Label>
                                        <Input id="supplierPlant" value={formData.supplierPlant || ''} onChange={(e) => handleFormChange(e, 'supplierPlant')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="supplierCode">Supplier Code</Label>
                                        <Input id="supplierCode" value={formData.supplierCode || ''} onChange={(e) => handleFormChange(e, 'supplierCode')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="keyContact">Key Contact</Label>
                                        <Input id="keyContact" value={formData.keyContact || ''} onChange={(e) => handleFormChange(e, 'keyContact')} />
                                    </div>
                                    <div className="space-y-2 md:col-span-3">
                                        <Label htmlFor="coreTeam">Core Team</Label>
                                        <Input id="coreTeam" value={formData.coreTeam || ''} onChange={(e) => handleFormChange(e, 'coreTeam')} />
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
                                    <div className="space-y-2">
                                        <Label htmlFor="originalFirstDate">Original First Date</Label>
                                        <Input id="originalFirstDate" type="date" value={formData.originalFirstDate || ''} onChange={(e) => handleFormChange(e, 'originalFirstDate')} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Label>Approval Dates</Label>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-md border p-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="plantApprovalDate">Plant Approval</Label>
                                            <Input id="plantApprovalDate" type="date" value={formData.plantApprovalDate || ''} onChange={(e) => handleFormChange(e, 'plantApprovalDate')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customerEngineeringApprovalDate">Cust. Eng. Approval</Label>
                                            <Input id="customerEngineeringApprovalDate" type="date" value={formData.customerEngineeringApprovalDate || ''} onChange={(e) => handleFormChange(e, 'customerEngineeringApprovalDate')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="customerQualityApprovalDate">Cust. Quality Approval</Label>
                                            <Input id="customerQualityApprovalDate" type="date" value={formData.customerQualityApprovalDate || ''} onChange={(e) => handleFormChange(e, 'customerQualityApprovalDate')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="otherApprovalDate">Other Approval</Label>
                                            <Input id="otherApprovalDate" type="date" value={formData.otherApprovalDate || ''} onChange={(e) => handleFormChange(e, 'otherApprovalDate')} />
                                        </div>
                                         <div className="space-y-2 md:col-span-2 lg:col-span-4">
                                            <Label htmlFor="otherApproval">Other Approval Text</Label>
                                            <Input id="otherApproval" value={formData.otherApproval || ''} onChange={(e) => handleFormChange(e, 'otherApproval')} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="planDescription">Plan Description</Label>
                                        <Textarea id="planDescription" value={formData.planDescription || ''} onChange={(e) => handleFormChange(e, 'planDescription')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="generalInformation">General Information</Label>
                                        <Textarea id="generalInformation" value={formData.generalInformation || ''} onChange={(e) => handleFormChange(e, 'generalInformation')} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="imageUrl">Image URL</Label>
                                        <Input id="imageUrl" value={formData.imageUrl || ''} onChange={(e) => handleFormChange(e, 'imageUrl')} />
                                    </div>
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
          <AlertDialog>
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
