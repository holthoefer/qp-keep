
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Workstation, Auftrag, ControlPlan, ProcessStep, DNA } from '@/types';
import { getWorkstations, saveWorkstation, getAuftraege, getControlPlans, getDnaData } from '@/lib/data';
import { Pencil, PlusCircle, RefreshCw, ListChecks, MoreHorizontal, Image as ImageIcon, MoreVertical, FolderKanban, Clock, AlertTriangle, Loader2, ArrowLeft, Wrench, Siren } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { generateThumbnailUrl } from '@/lib/image-utils';

export function WorkstationGrid() {
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [auftraege, setAuftraege] = React.useState<Auftrag[]>([]);
  const [controlPlans, setControlPlans] = React.useState<ControlPlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingWorkstation, setEditingWorkstation] =
    React.useState<Workstation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPO, setSelectedPO] = React.useState<string | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();
  
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');
  
  const [isWorkstationModalOpen, setIsWorkstationModalOpen] = React.useState(false);
  const [selectedWorkstationAp, setSelectedWorkstationAp] = React.useState<string | null>(null);


  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [workstationsData, auftraegeData, controlPlansData] = await Promise.all([
        getWorkstations(),
        getAuftraege(),
        getControlPlans(),
      ]);
      setWorkstations(workstationsData);
      setAuftraege(auftraegeData);
      setControlPlans(controlPlansData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch data from the database.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleImageClick = (e: React.MouseEvent, url: string, alt: string) => {
    e.stopPropagation();
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsImageModalOpen(true);
  };
  
  const handleWorkstationImageClick = (ap: string) => {
    router.push(`/arbeitsplatz/${ap}`);
  }

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

  const openDialogForNew = () => {
    setEditingWorkstation(null);
    setSelectedPO(undefined);
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


  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, ap: string) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    
    const { id } = toast({
      title: (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Lade Merkmale...</span>
        </div>
      ),
      duration: 5000, 
    });
    
    router.push(`/merkmale?ap=${encodeURIComponent(ap)}`);
  };

  const handleEditFieldClick = (e: React.MouseEvent, workstation: Workstation) => {
    e.stopPropagation();
    openDialogForEdit(workstation);
  };
  
  const handleIncidentClick = (e: React.MouseEvent, ap: string, po?: string) => {
    e.stopPropagation();
    router.push(`/incident?ap=${encodeURIComponent(ap)}&po=${encodeURIComponent(po || '')}`);
  }

  return (
    <>
      <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
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
                        'col-span-3',
                        !editingWorkstation && 'bg-green-100 dark:bg-green-900/50 font-bold'
                    )}
                    readOnly={!!editingWorkstation}
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
                />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="POcurrent" className="text-right">
                        POcurrent
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
                        CPcurrent
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
                        OPcurrent
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
                    LOTcurrent
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
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                   <Button variant="outline" size="icon" onClick={() => router.push('/notes')} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                  <CardTitle className="text-lg">Workstations</CardTitle>
              </div>
               <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={fetchData} className="h-8 w-8">
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Refresh</span>
                  </Button>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Aktionen</span>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialogForNew(); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Neuer Arbeitsplatz
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
        </CardHeader>
        <CardContent className="bg-muted/30 p-2 rounded-lg">
          {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                          <CardContent className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                      </Card>
                  ))}
              </div>
          ) : workstations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workstations.map((ws) => (
                  <Card key={ws.AP} className="flex flex-col hover:border-primary transition-colors cursor-pointer" onClick={(e) => handleCardClick(e, ws.AP)}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="group flex-1">
                              <CardTitle className="group-hover:text-primary transition-colors">{ws.AP}</CardTitle>
                              <CardDescription>{ws.Beschreibung}</CardDescription>
                          </div>
                           <button
                                onClick={(e) => ws.imageUrl && handleImageClick(e, ws.imageUrl, `Vollbildansicht für ${ws.AP}`)}
                                disabled={!ws.imageUrl}
                                className="disabled:cursor-not-allowed flex-shrink-0 h-12 w-12"
                            >
                              {ws.imageUrl ? (
                                  <Image
                                      src={generateThumbnailUrl(ws.imageUrl)}
                                      alt={`Foto für ${ws.AP}`}
                                      width={48}
                                      height={48}
                                      className="rounded-md object-cover aspect-square border"
                                  />
                              ) : (
                                  <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-md border">
                                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                              )}
                            </button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                          <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary" onClick={(e) => handleEditFieldClick(e, ws)} className="cursor-pointer hover:bg-secondary/80">Auftrag</Badge>
                                  <span className="text-left">{ws.POcurrent || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary" onClick={(e) => handleEditFieldClick(e, ws)} className="cursor-pointer hover:bg-secondary/80">Prozess</Badge>
                                  <span className="text-left">{ws.OPcurrent || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary" onClick={(e) => handleEditFieldClick(e, ws)} className="cursor-pointer hover:bg-secondary/80">Charge</Badge>
                                  <span className="text-left">{ws.LOTcurrent || 'N/A'}</span>
                              </div>
                               {ws.Bemerkung && <p className="text-xs text-muted-foreground pt-1">{ws.Bemerkung}</p>}
                          </div>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                           <div className="flex items-center gap-1">
                               <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                   <Wrench className="h-4 w-4" />
                               </Button>
                               <Button variant="outline" size="sm" onClick={(e) => handleIncidentClick(e, ws.AP, ws.POcurrent)}>
                                   <Siren className="h-4 w-4" />
                               </Button>
                           </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className='ml-auto' onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Aktionen</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuLabel>Aktionen für {ws.AP}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openDialogForEdit(ws)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Stammdaten bearbeiten
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleWorkstationImageClick(ws.AP)}>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Foto verwalten
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                      <Link href={`/auftraege`}>
                                        <FolderKanban className="mr-2 h-4 w-4" />
                                        Aufträge anzeigen
                                      </Link>
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </CardFooter>
                  </Card>
              ))}
            </div>
          ) : (
              <div className="text-center py-10 text-gray-500">
                  <p>Keine Arbeitsplätze gefunden.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
