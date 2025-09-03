
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { DNA, Workstation, ControlPlan, ProcessStep, StorageFile } from '@/types';
import { getDnaData, getWorkstations, getControlPlans, listStorageFiles } from '@/lib/data';
import { getDb } from '@/lib/firebase';
import { Search, ImageIcon, Clock, ArrowLeft, Loader2, Book, Shield, Target, LogOut, BrainCircuit, FolderKanban, LayoutGrid, FileImage } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { ImageModal } from '@/components/cp/ImageModal';
import { DashboardClient } from '@/components/cp/DashboardClient';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { findThumbnailUrl } from '@/lib/image-utils';
import { useRouter } from 'next/navigation';
import { SampleChart } from '@/components/SampleChart';
import { KeepKnowLogo } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const DnaTimeTracker = ({ lastTimestamp, frequency, prefix }: { lastTimestamp?: string, frequency?: number, prefix?: string }) => {
  const [remainingMinutes, setRemainingMinutes] = React.useState<number | null>(null);

  React.useEffect(() => {
    const calculateRemainingTime = () => {
      if (!lastTimestamp) {
        setRemainingMinutes(null);
        return;
      }
      
      const freq = frequency || 60; // Default to 60 minutes if not provided
      const lastCheckTime = new Date(lastTimestamp).getTime();
      const dueTime = lastCheckTime + freq * 60 * 1000;
      const now = new Date().getTime();
      const remainingMs = dueTime - now;
      
      setRemainingMinutes(Math.floor(remainingMs / (1000 * 60)));
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastTimestamp, frequency]);

  if (remainingMinutes === null) {
    return null;
  }
  
  const freq = frequency || 60;
  const isOverdue = remainingMinutes < 0;
  const percentageElapsed = (freq - remainingMinutes) / freq;
  const isWarning = !isOverdue && percentageElapsed >= 0.8;
  
  const badgeVariant = isOverdue ? "destructive" : isWarning ? "secondary" : "default";
  const timeText = isOverdue ? `${Math.abs(remainingMinutes)} min überfällig` : `${remainingMinutes} min verbleibend`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
           <Badge variant={badgeVariant} className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{`${timeText} (${prefix})`}</span>
           </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Nächste Prüfung fällig in ca. {remainingMinutes} Minuten.</p>
          <p className="text-xs text-muted-foreground">Letzte Prüfung: {lastTimestamp ? new Date(lastTimestamp).toLocaleString() : 'N/A'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export default function DnaPage() {
  const [dnaData, setDnaData] = React.useState<DNA[]>([]);
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [controlPlans, setControlPlans] = React.useState<ControlPlan[]>([]);
  const [storageFiles, setStorageFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  React.useEffect(() => {
    async function fetchData() {
      // Prevent fetching on server if firestore is not available
      if (!getDb()) {
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      try {
        const [dna, ws, cp, allFiles] = await Promise.all([
            getDnaData() as Promise<DNA[]>,
            getWorkstations(),
            getControlPlans(),
            listStorageFiles('uploads/'),
        ]);
        setDnaData(dna);
        setWorkstations(ws);
        setControlPlans(cp);
        setStorageFiles(allFiles);
      } catch (error) {
        console.error('Error fetching DNA data:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch DNA data from the database.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);
  
  const groupedAndFilteredDna = React.useMemo(() => {
    if (!dnaData || dnaData.length === 0) {
        return {};
    }
    const activeCombos = new Map<string, { ap: string, po: string, op: string }>();
    workstations.forEach(ws => {
      if (ws.AP && ws.POcurrent && ws.OPcurrent) {
        const key = `${ws.AP}~${ws.POcurrent}~${ws.OPcurrent}`;
        if (!activeCombos.has(key)) {
            activeCombos.set(key, { ap: ws.AP, po: ws.POcurrent, op: ws.OPcurrent });
        }
      }
    });

    const lowercasedFilter = searchTerm.toLowerCase();

    const filtered = dnaData.filter(dna => {
        const comboKey = `${dna.WP}~${dna.PO}~${dna.OP}`;
        const isActive = activeCombos.has(comboKey);
        
        if (!isActive) return false;

        if (!searchTerm) return true;
        
        const idString = dna.idDNA.toLowerCase();
        return idString.includes(lowercasedFilter);
    });

    const grouped = filtered.reduce((acc, dna) => {
        const groupKey = `${dna.WP} / ${dna.PO} / ${dna.OP}`;
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(dna);
        return acc;
    }, {} as Record<string, DNA[]>);

    // Sort the group keys (e.g., "AP-1 / ...", "AP-2 / ...")
    const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
        // Extract the workstation ID for comparison
        const wsA = a.split(' / ')[0];
        const wsB = b.split(' / ')[0];
        return wsA.localeCompare(wsB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Create a new sorted object
    const sortedGroupedDna: Record<string, DNA[]> = {};
    for (const key of sortedGroupKeys) {
        sortedGroupedDna[key] = grouped[key];
    }

    return sortedGroupedDna;

  }, [dnaData, workstations, searchTerm]);
  
    const getProcessStepForGroup = (groupKey: string): ProcessStep | null => {
        const [, po, op] = groupKey.split(' / ');
        const dnaForGroup = groupedAndFilteredDna[groupKey]?.[0];
        if (!dnaForGroup || !dnaForGroup.CP) return null;
        
        const plan = controlPlans.find(p => p.planNumber === dnaForGroup.CP);
        if (!plan) return null;
        
        const step = plan.processSteps.find(s => s.processNumber === op);
        return step || null;
    }

  const getErfassungUrl = (dna: DNA): string => {
      if (!dna.WP || !dna.PO || !dna.OP || !dna.Char) {
          return '#';
      }
      return `/erfassung?ap=${dna.WP}&po=${dna.PO}&op=${dna.OP}&charNum=${dna.Char}`;
  }

  const handleImageClick = (e: React.MouseEvent, url: string, alt: string) => {
    e.preventDefault();
    e.stopPropagation();
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsModalOpen(true);
  };
  
  const getStatusColor = (status?: string): string => {
    if (!status) return 'text-muted-foreground';
    if (status.includes('Out of Spec')) return 'text-red-500';
    if (status.includes('Out of Control')) return 'text-orange-500';
    return 'text-green-600';
  }

  const handlePointClick = (sampleId: string) => {
    // This function will be called from the chart
    if (!sampleId) return;

    // prevent default navigation if a point on chart is clicked
    if ((event?.target as HTMLElement).closest('a, button, [role="button"]')) {
      event?.preventDefault();
    }
    
    router.push(`/probe/${encodeURIComponent(sampleId)}`);
  };

  const hasVisibleData = Object.keys(groupedAndFilteredDna).length > 0;
  
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            DNA
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
            <Button variant="outline" size="sm" onClick={() => router.push('/auftraege')}>
                <FolderKanban className="mr-2 h-4 w-4" />
                PO
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                <Target className="mr-2 h-4 w-4" />
                CP
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                <Book className="mr-2 h-4 w-4" />
                LP
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/storage')}>
              <FileImage className="mr-2 h-4 w-4" />
              Storage
            </Button>
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
        <DashboardClient>
          <ImageModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            imageUrl={modalImageUrl}
            imageAlt={modalImageAlt}
          />
          <Card>
            <CardHeader>
               <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.push('/arbeitsplaetze')} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <CardTitle className="text-xl">DNA (Aktive Merkmale)</CardTitle>
                      <CardDescription>Gruppiert nach aktivem Arbeitsplatz, Auftrag & Prozess.</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Suche..."
                        className="pl-8 w-full md:w-auto"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                    <Skeleton key="s1" className="h-6 w-1/4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-40 w-full" />
                        ))}
                    </div>
                </div>
              ) : hasVisibleData ? (
                 <div className="space-y-6">
                    {Object.entries(groupedAndFilteredDna).map(([groupKey, dnaItems]) => {
                        const processStep = getProcessStepForGroup(groupKey);
                        const wpId = groupKey.split(' / ')[0];
                        const workstation = workstations.find(ws => ws.AP === wpId);
                        const cpId = dnaItems[0]?.CP;
                        const controlPlan = controlPlans.find(cp => cp.planNumber === cpId);
                        
                        return (
                        <div key={groupKey}>
                            <div className="flex justify-between items-center mb-2 p-2 bg-muted rounded-lg">
                               <div className="flex items-center gap-3">
                                  {workstation?.imageUrl && (
                                      <button
                                          onClick={(e) => handleImageClick(e, workstation.imageUrl!, `Bild für Arbeitsplatz ${workstation.AP}`)}
                                          className="relative flex-shrink-0"
                                      >
                                          <Image
                                              src={findThumbnailUrl(workstation.imageUrl, storageFiles)}
                                              alt={`Bild für Arbeitsplatz ${workstation.AP}`}
                                              width={40}
                                              height={40}
                                              className="rounded-md object-cover aspect-square border"
                                          />
                                      </button>
                                  )}
                                  <h3 className="font-semibold">{groupKey}</h3>
                               </div>
                               <div className="flex items-center gap-3">
                                  {processStep?.imageUrl && (
                                      <button
                                          onClick={(e) => handleImageClick(e, processStep.imageUrl!, `Bild für Prozess ${processStep.processNumber}`)}
                                          className="relative flex-shrink-0"
                                      >
                                          <Image
                                              src={findThumbnailUrl(processStep.imageUrl, storageFiles)}
                                              alt={`Bild für Prozess ${processStep.processNumber}`}
                                              width={40}
                                              height={40}
                                              className="rounded-md object-cover aspect-square border"
                                          />
                                      </button>
                                  )}
                                  {controlPlan?.imageUrl && (
                                      <button
                                          onClick={(e) => handleImageClick(e, controlPlan.imageUrl!, `Bild für Control Plan ${controlPlan.planNumber}`)}
                                          className="relative flex-shrink-0"
                                      >
                                          <Image
                                              src={findThumbnailUrl(controlPlan.imageUrl, storageFiles)}
                                              alt={`Bild für Control Plan ${controlPlan.planNumber}`}
                                              width={40}
                                              height={40}
                                              className="rounded-md object-cover aspect-square border"
                                          />
                                      </button>
                                  )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {dnaItems.map((dna) => {
                                    const erfassungUrl = getErfassungUrl(dna);
                                    const isLinkDisabled = erfassungUrl === '#';

                                    return (
                                        <Link key={dna.idDNA} href={erfassungUrl} className={`block group ${isLinkDisabled ? 'pointer-events-none' : ''}`}>
                                        <Card className="h-full flex flex-col hover:border-primary transition-colors cursor-pointer bg-gradient-to-br from-card to-muted/20">
                                            <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2 flex-shrink min-w-0">
                                                    {dna.imageUrlLatestSample && (
                                                         <button
                                                            onClick={(e) => handleImageClick(e, dna.imageUrlLatestSample!, `Letztes Sample Bild`)}
                                                            className="relative"
                                                        >
                                                            <Image
                                                                src={findThumbnailUrl(dna.imageUrlLatestSample, storageFiles)}
                                                                alt={`Letztes Sample Bild`}
                                                                width={32}
                                                                height={32}
                                                                className="rounded-md object-cover aspect-square border"
                                                            />
                                                        </button>
                                                    )}
                                                    <CardTitle className="text-sm font-mono break-all flex-1 pr-2">{dna.idDNA}</CardTitle>
                                                </div>
                                                <div className="flex-shrink-0">
                                                     {dna.imageUrl && (
                                                        <button
                                                            onClick={(e) => handleImageClick(e, dna.imageUrl!, `Bild für Merkmal`)}
                                                            className="relative flex-shrink-0"
                                                        >
                                                            <Image
                                                                src={findThumbnailUrl(dna.imageUrl, storageFiles)}
                                                                alt={`Bild für Merkmal`}
                                                                width={32}
                                                                height={32}
                                                                className="rounded-md object-cover aspect-square border"
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    {dna.checkStatus && (
                                                        <div className={`font-semibold ${getStatusColor(dna.checkStatus)}`}>
                                                            {dna.checkStatus}
                                                        </div>
                                                    )}
                                                    <DnaTimeTracker lastTimestamp={dna.lastCheckTimestamp} frequency={dna.Frequency} prefix={`M# ${dna.Char}`} />
                                                </div>
                                                {dna.Memo && (
                                                    <div className="p-2 bg-muted/50 rounded-md">
                                                        <p className="text-muted-foreground line-clamp-3">{dna.Memo}</p>
                                                    </div>
                                                )}
                                                 <div className="h-[200px] w-full" onClick={(e) => e.stopPropagation()}>
                                                    <SampleChart dnaData={dna} onPointClick={handlePointClick} />
                                                 </div>
                                                {isLinkDisabled && <Badge variant="destructive" className="mt-2">Unvollständige Daten für Link</Badge>}
                                            </CardContent>
                                        </Card>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )})}
                 </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>Keine aktiven DNA Daten gefunden oder Filter ergab keine Treffer.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardClient>
      </main>
    </div>
  );
}
