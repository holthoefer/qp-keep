
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
  DialogTrigger,
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
import type { Workstation, Auftrag, ControlPlan, ProcessStep, DNA, StorageFile } from '@/types';
import { getWorkstations, saveWorkstation, getAuftraege, getControlPlans, getDnaData, listStorageFiles } from '@/lib/data';
import { Pencil, PlusCircle, RefreshCw, ListChecks, MoreHorizontal, Image as ImageIcon, MoreVertical, FolderKanban, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { findThumbnailUrl } from '@/lib/image-utils';


interface DueInfo {
  timeRemaining: number;
  charNum: string;
  frequency: number;
  lastCheckTimestamp?: string;
  checkStatus?: string;
  memo?: string;
}

const getExampleWorkstations = (): Workstation[] => [
    {
        AP: "AP-01",
        Beschreibung: "Montage & Endkontrolle",
        Bemerkung: "Nur für geschultes Personal. Hey",
        CPcurrent: "c001",
        LOTcurrent: "LOT-A456",
        OPcurrent: "OP-10",
        POcurrent: "po001",
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/quapilot-p96ds.firebasestorage.app/o/uploads%2Farbeitsplaetze%2FAP-1%2F1756109425615_QUA_PILOT_1_color%20(80%20x%2080%20mm).png?alt=media&token=4cf68f00-1136-404d-ac5c-896337",
    }
];

const WorkstationNextDue = ({ workstation }: { workstation: Workstation }) => {
    const [dueInfos, setDueInfos] = React.useState<DueInfo[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const findNextDue = async () => {
             if (!workstation.POcurrent || !workstation.OPcurrent) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const allDna = await getDnaData() as DNA[];
                const relevantDna = allDna.filter(d => 
                    d.PO === workstation.POcurrent && 
                    d.OP === workstation.OPcurrent && 
                    d.WP === workstation.AP
                );

                if (relevantDna.length === 0) {
                    setDueInfos([]);
                    return;
                }
                
                const infos: DueInfo[] = relevantDna.map(dna => {
                    if (dna.lastCheckTimestamp) {
                        const freq = dna.Frequency || 60;
                        const lastCheckTime = new Date(dna.lastCheckTimestamp).getTime();
                        const dueTime = lastCheckTime + freq * 60 * 1000;
                        
                        const now = new Date().getTime();
                        const timeRemaining = Math.floor((dueTime - now) / (1000 * 60));

                        return {
                            timeRemaining,
                            charNum: dna.Char,
                            frequency: freq,
                            lastCheckTimestamp: dna.lastCheckTimestamp,
                            checkStatus: dna.checkStatus,
                            memo: dna.Memo,
                        };
                    }
                    return null;
                }).filter((info): info is DueInfo => info !== null);

                setDueInfos(infos);

            } catch (error) {
                console.error("Error calculating next due date:", error);
            } finally {
                setIsLoading(false);
            }
        };

        findNextDue();
    }, [workstation]);

    if (isLoading) {
        return <Skeleton className="h-5 w-24 mt-1" />;
    }

    if (dueInfos.length === 0) {
        return null;
    }

    const exceptions = dueInfos.filter(d => d.checkStatus && (d.checkStatus.includes('Out of Spec') || d.checkStatus.includes('Out of Control')));
    const overdue = dueInfos.filter(d => d.timeRemaining < 0).sort((a,b) => a.timeRemaining - b.timeRemaining);
    const warnings = dueInfos.filter(d => {
        const percentageElapsed = (d.frequency - d.timeRemaining) / d.frequency;
        return d.timeRemaining >= 0 && percentageElapsed >= 0.8;
    }).sort((a, b) => a.timeRemaining - b.timeRemaining);

    // Create a map to ensure unique characteristics, with exceptions taking priority.
    const prioritizedInfos = new Map<string, DueInfo>();
    
    exceptions.forEach(info => prioritizedInfos.set(info.charNum, info));
    overdue.forEach(info => {
        if (!prioritizedInfos.has(info.charNum)) {
            prioritizedInfos.set(info.charNum, info);
        }
    });
    warnings.forEach(info => {
        if (!prioritizedInfos.has(info.charNum)) {
            prioritizedInfos.set(info.charNum, info);
        }
    });

    const badgesToShow = Array.from(prioritizedInfos.values()).slice(0, 3);
    
    const getErfassungUrl = (charNum: string) => {
      if (!workstation.AP || !workstation.POcurrent || !workstation.OPcurrent) return '#';
      return `/erfassung?ap=${encodeURIComponent(workstation.AP)}&po=${workstation.POcurrent}&op=${workstation.OPcurrent}&charNum=${charNum}`;
    }

    const renderBadge = (info: DueInfo) => {
        const isException = info.checkStatus && (info.checkStatus.includes('Out of Spec') || info.checkStatus.includes('Out of Control'));
        const isOverdue = info.timeRemaining < 0 && !isException;
        
        const url = getErfassungUrl(info.charNum);

        if (isException) {
             const timeSinceException = info.lastCheckTimestamp ? Math.floor((new Date().getTime() - new Date(info.lastCheckTimestamp).getTime()) / (1000 * 60)) : 0;
             const timeText = `vor ${timeSinceException} min`;
            return (
                 <div className="mt-2 space-y-1">
                    <Link href={url} onClick={(e) => e.stopPropagation()}>
                        <Badge variant="destructive" className="flex items-center gap-1.5 cursor-pointer hover:bg-destructive/80">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{`${info.checkStatus} (${timeText}) (M# ${info.charNum})`}</span>
                        </Badge>
                    </Link>
                    {info.memo && <p className="text-xs text-destructive p-2 bg-destructive/10 rounded-md line-clamp-5">{info.memo}</p>}
                </div>
            )
        }
        
        return (
            <Link href={url} className="inline-block" onClick={(e) => e.stopPropagation()}>
                <Badge variant={isOverdue ? "destructive" : "default"}>
                    {isOverdue ? `Overdue by ${Math.abs(info.timeRemaining)} min` : `${info.timeRemaining} min left`}
                    {` (M# ${info.charNum})`}
                </Badge>
            </Link>
        )
    }

    if (badgesToShow.length === 0) {
        const nextDue = dueInfos.filter(d => d.timeRemaining >= 0).sort((a, b) => a.timeRemaining - b.timeRemaining)[0];
        if (nextDue) {
            return (
                <div className="flex flex-col items-start gap-1 mt-2">
                    {renderBadge(nextDue)}
                </div>
            );
        }
        return null;
    }
    
    return (
        <div className="flex flex-col items-start gap-1 mt-2">
            {badgesToShow.map(info => (
                <div key={info.charNum}>
                    {renderBadge(info)}
                </div>
            ))}
        </div>
    );
};


export function WorkstationGrid() {
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [auftraege, setAuftraege] = React.useState<Auftrag[]>([]);
  const [controlPlans, setControlPlans] = React.useState<ControlPlan[]>([]);
  const [storageFiles, setStorageFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExampleData, setIsExampleData] = React.useState(false);
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


  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsExampleData(false);
    try {
      const [workstationsData, auftraegeData, controlPlansData, allFiles] = await Promise.all([
        getWorkstations(),
        getAuftraege(),
        getControlPlans(),
        listStorageFiles('uploads/'),
      ]);
      
      if (workstationsData.length === 0) {
        setWorkstations(getExampleWorkstations());
        setIsExampleData(true);
      } else {
        setWorkstations(workstationsData);
      }

      setAuftraege(auftraegeData);
      setControlPlans(controlPlansData);
      setStorageFiles(allFiles);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setWorkstations(getExampleWorkstations());
        setIsExampleData(true);
      } else {
        console.error('Error fetching data:', error);
        toast({
            title: 'Error',
            description: 'Could not fetch data from the database.',
            variant: 'destructive',
        });
      }
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
    const isNew = !editingWorkstation;

    if (isExampleData && !isNew) {
        toast({ title: 'Beispieldaten', description: 'Beispieldaten können nicht bearbeitet werden. Bitte legen Sie einen neuen Arbeitsplatz an.', variant: 'destructive' });
        return;
    }
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
    if (isExampleData) {
        toast({ title: 'Beispieldaten', description: 'Beispieldaten können nicht bearbeitet werden. Bitte legen Sie einen neuen Arbeitsplatz an, um ihn zu bearbeiten.' });
        return;
    }
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

    // Reset dependent fields in the form directly
    if (formRef.current) {
      const opCurrentSelect = formRef.current.elements.namedItem('OPcurrent') as HTMLSelectElement | null;
      if (opCurrentSelect) {
         // This is a bit of a hack as we can't control the Select component directly here
         // A better approach would be to use a form library like react-hook-form
         // But for a quick fix, we can try to find the button and update its text
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
    // If the click is on a button, don't navigate
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    
    if (isExampleData) {
        toast({ title: 'Beispieldaten', description: 'Dies ist ein Beispieldatensatz. Bitte legen Sie zuerst einen echten Arbeitsplatz an.' });
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

  return (
    <>
      <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="py-2 px-0">
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle className="text-lg">Arbeitsplätze</CardTitle>
              </div>
               <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={fetchData} className="h-8 w-8">
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Refresh</span>
                  </Button>
                  <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                      if(!isOpen) {
                          setEditingWorkstation(null);
                          setSelectedPO(undefined);
                      }
                      setIsDialogOpen(isOpen);
                  }}>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Aktionen</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDialogForNew(); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Neuer Arbeitsplatz
                              </DropdownMenuItem>
                            </DialogTrigger>
                          </DropdownMenuContent>
                      </DropdownMenu>
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
                                      src={findThumbnailUrl(ws.imageUrl, storageFiles)}
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
                               <WorkstationNextDue workstation={ws} />
                          </div>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                           <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/merkmale?ap=${encodeURIComponent(ws.AP)}`}>
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    Liste Merkmale
                                </Link>
                           </Button>
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

    