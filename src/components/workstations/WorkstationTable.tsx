
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Workstation, Auftrag, ControlPlan, ProcessStep, DNA } from '@/types';
import { getWorkstations, saveWorkstation, getAuftraege, getControlPlans, getDnaData } from '@/lib/data';
import { Pencil, PlusCircle, RefreshCw, Clock, AlertTriangle, Loader2, Wrench, Siren, Zap, MoreVertical, ImageIcon, FolderKanban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { generateThumbnailUrl } from '@/lib/image-utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '../ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


const NextCheckBadge = ({ dna, onClick }: { dna: DNA; onClick: (e: React.MouseEvent) => void }) => {
  const [remainingMinutes, setRemainingMinutes] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!dna.lastCheckTimestamp || !dna.Frequency) {
      setRemainingMinutes(null);
      return;
    }

    const calculateRemainingTime = () => {
        const lastCheckTime = new Date(dna.lastCheckTimestamp!).getTime();
        const dueTime = lastCheckTime + dna.Frequency! * 60 * 1000;
        const now = new Date().getTime();
        const remaining = Math.floor((dueTime - now) / (1000 * 60));
        setRemainingMinutes(remaining);
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000);
    return () => clearInterval(interval);
  }, [dna.lastCheckTimestamp, dna.Frequency]);


  if (remainingMinutes === null) {
    return null;
  }

  const isOverdue = remainingMinutes < 0;
  
  let badgeVariant: "destructive" | "secondary" | "default" = "default";
  
  if (isOverdue) {
    badgeVariant = "destructive";
  } else if (dna.Frequency && dna.lastCheckTimestamp) {
    const totalInterval = dna.Frequency;
    const timeElapsed = (new Date().getTime() - new Date(dna.lastCheckTimestamp).getTime()) / (1000 * 60);
    if ((totalInterval - timeElapsed) / totalInterval < 0.2) {
        badgeVariant = "secondary"; // Yellow-ish for last 20% of time
    }
  }
  
 const timeText = isOverdue ? `-${Math.abs(remainingMinutes)}m!` : `${remainingMinutes}m`;

  return (
      <Button variant="ghost" size="sm" className="h-auto p-0" onClick={onClick}>
        <Badge variant={badgeVariant} className={cn("cursor-pointer", badgeVariant === 'secondary' && 'bg-amber-400/80 text-black hover:bg-amber-400/70')}>
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          <span>
              M#{dna.Char}: {timeText}
          </span>
        </Badge>
      </Button>
  );
};


export function WorkstationTable() {
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [auftraege, setAuftraege] = React.useState<Auftrag[]>([]);
  const [controlPlans, setControlPlans] = React.useState<ControlPlan[]>([]);
  const [allDna, setAllDna] = React.useState<DNA[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingWorkstation, setEditingWorkstation] =
    React.useState<Workstation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPO, setSelectedPO] = React.useState<string | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();
  
  const formRef = React.useRef<HTMLFormElement>(null);


  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const getErfassungUrl = (dna: DNA) => {
      if (!dna.WP || !dna.PO || !dna.OP || !dna.Char) {
          return '#';
      }
      const baseUrl = dna.charType === 'A' ? '/inputattr' : '/erfassung';
      return `${baseUrl}?ap=${dna.WP}&po=${dna.PO}&op=${dna.OP}&charNum=${dna.Char}`;
  }

  const handleRowClick = (ap: string) => {
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
  
  const handleBadgeClick = (e: React.MouseEvent, dna: DNA) => {
      e.stopPropagation();
      const url = getErfassungUrl(dna);
      if (url === '#') return;
      router.push(url);
  }

  const handleIncidentClick = (e: React.MouseEvent, ap: string, po?: string) => {
    e.stopPropagation();
    router.push(`/incident?ap=${encodeURIComponent(ap)}&po=${encodeURIComponent(po || '')}`);
  }

  const handleEventClick = (e: React.MouseEvent, ap: string) => {
    e.stopPropagation();
    router.push(`/event/new?ap=${encodeURIComponent(ap)}`);
  }

  return (
    <>
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
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><Zap className="h-4 w-4 mx-auto" /></TableHead>
                        <TableHead className="w-16">AP#</TableHead>
                        <TableHead className="w-28">Status Zeit</TableHead>
                        <TableHead>Verletzungen</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>OP</TableHead>
                        <TableHead>LOT</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : workstations.length > 0 ? (
                        workstations.map((ws) => {
                            const dnaForWorkstation = allDna.filter(d => d.WP === ws.AP && d.PO === ws.POcurrent && d.OP === ws.OPcurrent);
                            const exceptionDnas = dnaForWorkstation.filter(dna => dna.checkStatus && dna.checkStatus !== 'OK');
                            let nextDueDna: DNA | null = null;
                            let shortestTime = Infinity;

                            dnaForWorkstation.forEach(dna => {
                                if (dna.lastCheckTimestamp && dna.Frequency) {
                                    const lastCheckTime = new Date(dna.lastCheckTimestamp).getTime();
                                    const dueTime = lastCheckTime + dna.Frequency * 60 * 1000;
                                    const now = new Date().getTime();
                                    const remainingMinutes = dueTime - now;
                                    if (remainingMinutes < shortestTime) {
                                        shortestTime = remainingMinutes;
                                        nextDueDna = dna;
                                    }
                                }
                            });

                            return (
                            <TableRow key={ws.AP} onClick={() => handleRowClick(ws.AP)} className="cursor-pointer">
                                 <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className='h-8 w-8'>
                                              <MoreVertical className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aktionen für {ws.AP}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => openDialogForEdit(ws)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Stammdaten bearbeiten
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => handleEventClick(e, ws.AP)}>
                                            <Wrench className="mr-2 h-4 w-4" /> Event erfassen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => handleIncidentClick(e, ws.AP, ws.POcurrent)}>
                                            <Siren className="mr-2 h-4 w-4" /> Incident melden
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                 <button
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/arbeitsplatz/${ws.AP}`); }}
                                                    className="flex items-center gap-2 group"
                                                 >
                                                     {ws.imageUrl ? (
                                                        <Image
                                                            src={generateThumbnailUrl(ws.imageUrl)}
                                                            alt={`Bild für ${ws.AP}`}
                                                            width={32}
                                                            height={32}
                                                            className="rounded object-cover aspect-square border group-hover:ring-2 group-hover:ring-primary"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border group-hover:ring-2 group-hover:ring-primary">
                                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                 </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-bold">{ws.AP}</p>
                                                <p>{ws.Beschreibung}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                    {nextDueDna && <NextCheckBadge dna={nextDueDna} onClick={(e) => handleBadgeClick(e, nextDueDna!)} />}
                                </TableCell>
                                <TableCell>
                                    {exceptionDnas.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {exceptionDnas.map(dna => (
                                                <Button
                                                    key={dna.idDNA}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0"
                                                    onClick={(e) => handleBadgeClick(e, dna)}
                                                >
                                                    <Badge variant="destructive" className="cursor-pointer">
                                                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                                                        M#{dna.Char}
                                                    </Badge>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>{ws.POcurrent || 'N/A'}</TableCell>
                                <TableCell>{ws.OPcurrent || 'N/A'}</TableCell>
                                <TableCell>{ws.LOTcurrent || 'N/A'}</TableCell>
                            </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                Keine Arbeitsplätze gefunden.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </>
  );
}
