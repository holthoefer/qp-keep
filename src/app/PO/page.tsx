
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit, Trash2, Shield, ListChecks, Target, Book, LayoutGrid, FolderKanban, Network, LogOut, FileImage, StickyNote, Wrench, Siren, ArrowLeft, MoreVertical, UploadCloud } from 'lucide-react';
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
  getAppStorage,
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
import Image from 'next/image';
import logo from '../Logo.png';
import Link from 'next/link';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';


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
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = (file: File) => {
    const poNumber = formData.PO;
    if (!poNumber) {
        setUploadError("Bitte geben Sie zuerst eine Auftragsnummer an, bevor Sie hochladen.");
        return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storage = getAppStorage();
    if (!storage) {
        setUploadError("Storage-Dienst ist nicht initialisiert.");
        setIsUploading(false);
        return;
    }
    const storageRef = ref(storage, `uploads/auftraege/${poNumber}/${Date.now()}_${file.name}`);
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
        setFormData(prev => ({...prev, imageUrl: downloadURL}));
        setIsUploading(false);
        toast({ title: 'Upload erfolgreich', description: 'URL wurde dem Formular hinzugefügt.' });
      }
    );
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    try {
      if (editingItem) {
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
    setUploadError(null);
    setIsUploading(false);
    setUploadProgress(0);
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
    setUploadError(null);
    setIsUploading(false);
    setUploadProgress(0);
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
            <Link href="/" aria-label="Zur Startseite">
              <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
            </Link>
            {/* Desktop View: Full Buttons */}
            <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    WP
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                    <Network className="mr-2 h-4 w-4" />
                    DNA
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
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                    <StickyNote className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/events')}>
                    <Wrench className="h-4 w-4" />
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
                    <AvatarImage src={auth.user?.photoURL || undefined} alt={auth.user?.displayName || auth.user?.email || ''} />
                    <AvatarFallback>{auth.user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{auth.user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={auth.logout}>
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
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => router.push('/notes')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-headline text-2xl font-semibold">PO-List</h2>
            </div>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> neu
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
                        <Label htmlFor="imageUrl">Bild</Label>
                        <div className="flex items-center gap-2">
                          <Button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              variant="outline"
                              disabled={isUploading || !formData.PO}
                          >
                              <UploadCloud className="mr-2 h-4 w-4" />
                              {isUploading ? `${Math.round(uploadProgress)}%` : 'Hochladen'}
                          </Button>
                          <Input id="imageUrl" value={formData.imageUrl} onChange={(e) => handleFormChange(e, 'imageUrl')} placeholder="https://..." className="flex-grow" />
                        </div>
                         <Input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                            className="hidden"
                            accept="image/*"
                         />
                         {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                         {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
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
                  <TableHead className="w-20">Bild</TableHead>
                  <TableHead>Auftrags-Nr. (PO)</TableHead>
                  <TableHead>Control Plan</TableHead>
                  <TableHead>Anmerkung</TableHead>
                  {isAdmin && <TableHead className="text-right">Aktionen</TableHead>}
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
                      Keine Aufträge gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                       <TableCell className="p-1">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={`Bild für ${item.PO}`} width={64} height={64} className="rounded-md object-cover w-16 h-16"/>
                          ) : (
                             <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-md text-muted-foreground">
                                <FileImage className="h-6 w-6" />
                             </div>
                          )}
                      </TableCell>
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
