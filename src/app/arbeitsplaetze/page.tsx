

'use client';

import * as React from 'react';
import { WorkstationGrid } from "@/components/workstations/WorkstationGrid";
import { WorkstationTable } from "@/components/workstations/WorkstationTable";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth-context";
import { Book, ListChecks, Shield, Target, FolderKanban, LogOut, Network, FileImage, Siren, Wrench, LayoutGrid, MoreVertical, StickyNote, Table as TableIcon, PlusCircle } from "lucide-react";
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Workstation, Auftrag, ControlPlan, ProcessStep, DNA } from '@/types';
import { getWorkstations, saveWorkstation, getAuftraege, getControlPlans, getDnaData } from '@/lib/data';


export default function ArbeitsplaetzePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, logout, isAdmin } = useAuth();
    const { toast } = useToast();
    const [view, setView] = React.useState<'grid' | 'list'>('list');
    
    const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
    const [auftraege, setAuftraege] = React.useState<Auftrag[]>([]);
    const [controlPlans, setControlPlans] = React.useState<ControlPlan[]>([]);
    const [allDna, setAllDna] = React.useState<DNA[]>([]);
    const [editingWorkstation, setEditingWorkstation] = React.useState<Workstation | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedPO, setSelectedPO] = React.useState<string | undefined>(undefined);
    
    const formRef = React.useRef<HTMLFormElement>(null);


    const fetchData = React.useCallback(async () => {
        try {
          const [workstationsData, auftraegeData, controlPlansData, dnaData] = await Promise.all([
            getWorkstations(),
            getAuftraege(),
            getControlPlans(),
            getDnaData(),
          ]);
          setWorkstations(workstationsData);
          setAuftraege(auftraegeData);
          setControlPlans(controlPlansData);
          setAllDna(dnaData);
        } catch (error) {
          console.error('Error fetching data:', error);
          toast({
            title: 'Error',
            description: 'Could not fetch data from the database.',
            variant: 'destructive',
          });
        }
      }, [toast]);

    React.useEffect(() => {
        const message = searchParams.get('message');
        if(message) {
            toast({
                title: "Agenten-Nachricht",
                description: message,
                duration: 4000,
            })
        }
        fetchData();
    }, [searchParams, toast, fetchData]);
    
    const handleLogout = async () => {
        await logout();
        router.push('/');
    };
    
    const openDialogForNew = React.useCallback(() => {
        setEditingWorkstation(null);
        setSelectedPO(undefined);
        setIsDialogOpen(true);
    }, []);

    React.useEffect(() => {
        if (searchParams.get('new') === 'true') {
            openDialogForNew();
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('new');
            router.replace(newUrl.toString(), { scroll: false });
        }
    }, [searchParams, router, openDialogForNew]);
    
    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const ap = formData.get('AP') as string;
        let poCurrent = formData.get('POcurrent') as string;
        let opCurrent = formData.get('OPcurrent') as string;

        if (poCurrent === 'none') poCurrent = '';
        if (opCurrent === 'none') opCurrent = '';

        if (!ap) {
          toast({
            title: 'Validation Error',
            description: 'AP field is required.',
            variant: 'destructive',
          });
          return;
        }

        const isNew = !editingWorkstation;

        const workstationData: Workstation = {
          AP: ap,
          Beschreibung: formData.get('Beschreibung') as string,
          POcurrent: poCurrent,
          CPcurrent: formData.get('CPcurrent') as string,
          OPcurrent: opCurrent,
          Bemerkung: formData.get('Bemerkung') as string,
          LOTcurrent: formData.get('LOTcurrent') as string,
          imageUrl: editingWorkstation?.imageUrl || ''
        };

        try {
          await saveWorkstation(workstationData, isNew);
          toast({
            title: 'Success',
            description: `Workstation ${workstationData.AP} saved.`,
            duration: 1000,
          });
          setIsDialogOpen(false);
          setEditingWorkstation(null);
          fetchData(); // Refetch data after saving
        } catch (error: any) {
          console.error('Error saving workstation:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to save workstation.',
            variant: 'destructive',
          });
        }
    };
    
      const openDialogForEdit = async (workstation: Workstation) => {
        await fetchData(); 
        setEditingWorkstation(workstation);
        setSelectedPO(workstation.POcurrent);
        setIsDialogOpen(true);
      };
      
      const selectedAuftrag = auftraege.find(a => a.PO === selectedPO);
      const selectedControlPlan = controlPlans.find(cp => cp.planNumber === selectedAuftrag?.CP);
      const availableProcessSteps: ProcessStep[] = selectedControlPlan?.processSteps || [];

      const handlePoChange = (value: string) => {
        const newPo = value === 'none' ? undefined : value;
        setSelectedPO(newPo);

        if (formRef.current) {
          const opCurrentSelect = formRef.current.elements.namedItem('OPcurrent') as HTMLSelectElement | null;
          if (opCurrentSelect) {
             const trigger = opCurrentSelect.closest('[role="combobox"]');
             const valueDisplay = trigger?.querySelector('span');
             if(valueDisplay) valueDisplay.textContent = "Prozessschritt auswählen";
          }

          const cpCurrentInput = formRef.current.elements.namedItem('CPcurrent') as HTMLInputElement;
          const auftrag = auftraege.find(a => a.PO === newPo);
          const cp = controlPlans.find(c => c.planNumber === auftrag?.CP);
          cpCurrentInput.value = cp?.planNumber || '';

          if (!newPo) {
              const lotCurrentInput = formRef.current.elements.namedItem('LOTcurrent') as HTMLInputElement;
              const bemerkungInput = formRef.current.elements.namedItem('Bemerkung') as HTMLInputElement;
              lotCurrentInput.value = '';
              bemerkungInput.value = '';
          }
        }
      };


    return (
        <div className="flex min-h-screen flex-col bg-background">
             <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                  if(!isOpen) {
                      setEditingWorkstation(null);
                      setSelectedPO(undefined);
                  }
                  setIsDialogOpen(isOpen);
              }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                        {editingWorkstation ? 'Arbeitsplatz bearbeiten' : 'Neuen Arbeitsplatz anlegen'}
                        </DialogTitle>
                        <DialogDescription>
                        {editingWorkstation ? `Änderungen für ${editingWorkstation.AP} vornehmen.` : 'Füllen Sie die Details aus.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} ref={formRef}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="AP" className="text-right">
                            AP (Key)
                        </Label>
                          <Input
                            id="AP"
                            name="AP"
                            defaultValue={editingWorkstation?.AP}
                            className={cn(
                                'col-span-3 font-bold',
                                !editingWorkstation && 'bg-green-100 dark:bg-green-900/50'
                            )}
                            readOnly
                            disabled
                        />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="Beschreibung" className="text-right">
                            Beschreibung
                        </Label>
                        <Input
                            id="Beschreibung"
                            name="Beschreibung"
                            defaultValue={editingWorkstation?.Beschreibung}
                            className="col-span-3"
                            disabled={!!editingWorkstation}
                        />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="POcurrent" className="text-right">
                                PO
                            </Label>
                            <Select name="POcurrent" defaultValue={editingWorkstation?.POcurrent || 'none'} onValueChange={handlePoChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Auftrag auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Kein Auftrag</SelectItem>
                                    {auftraege.map(auftrag => (
                                    <SelectItem key={auftrag.PO} value={auftrag.PO}>
                                        {auftrag.PO}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="CPcurrent" className="text-right">
                                CP
                            </Label>
                            <Input
                                id="CPcurrent"
                                name="CPcurrent"
                                value={selectedControlPlan?.planNumber || ''}
                                className="col-span-3"
                                readOnly
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="OPcurrent" className="text-right">
                                OP
                            </Label>
                            <Select name="OPcurrent" defaultValue={editingWorkstation?.OPcurrent || 'none'} key={selectedControlPlan?.id || 'none'}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Prozessschritt auswählen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Kein Prozessschritt</SelectItem>
                                    {availableProcessSteps.map(step => (
                                    <SelectItem key={step.id} value={step.processNumber}>
                                        {step.processNumber} - {step.processName}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="LOTcurrent" className="text-right">
                            LOT
                        </Label>
                        <Input
                            id="LOTcurrent"
                            name="LOTcurrent"
                            defaultValue={editingWorkstation?.LOTcurrent}
                            className="col-span-3"
                        />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="Bemerkung" className="text-right">
                            Bemerkung
                        </Label>
                        <Input
                            id="Bemerkung"
                            name="Bemerkung"
                            defaultValue={editingWorkstation?.Bemerkung}
                            className="col-span-3"
                        />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Speichern</Button>
                    </DialogFooter>
                    </form>
                </DialogContent>
              </Dialog>
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" aria-label="Zur Startseite">
                      <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
                    </Link>
                     {/* Desktop View: Full Buttons */}
                    <div className="hidden md:flex items-center gap-2">
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
                         <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                            <Book className="mr-2 h-4 w-4" />
                            LP
                        </Button>
                    </div>
                     {/* Mobile View: Icons and Dropdown */}
                    <div className="md:hidden flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/dna')}>
                            <Network className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/PO')}>
                            <FolderKanban className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                            <StickyNote className="h-4 w-4" />
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
                            <DropdownMenuItem onClick={() => router.push('/events')}>
                                <Wrench className="mr-2 h-4 w-4" />
                                <span>Events</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/incidents')}>
                                <Siren className="mr-2 h-4 w-4" />
                                <span>Incidents</span>
                            </DropdownMenuItem>
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

                <div className="flex items-center gap-1 md:gap-2">
                     <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                      {view === 'grid' ? (
                           <Button
                            variant='secondary'
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setView('list')}
                          >
                            <TableIcon className="h-4 w-4" />
                          </Button>
                       ) : (
                          <Button
                            variant='secondary'
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setView('grid')}
                          >
                            <LayoutGrid className="h-4 w-4" />
                             <span className="ml-2 hidden lg:inline">Grid</span>
                          </Button>
                      )}
                    </div>
                     {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={openDialogForNew} className="h-8 w-8">
                            <PlusCircle className="h-4 w-4" />
                            <span className="sr-only">Neuer Arbeitsplatz</span>
                        </Button>
                     )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
                          <Avatar>
                            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || ''} />
                            <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Admin</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Ausloggen</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                {view === 'grid' ? 
                    <WorkstationGrid workstations={workstations} allDna={allDna} onEdit={openDialogForEdit} /> : 
                    <WorkstationTable workstations={workstations} allDna={allDna} onEdit={openDialogForEdit} />
                }
            </main>
        </div>
    );
}
