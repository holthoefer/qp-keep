

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getWorkstations,
  getAuftraege,
  getControlPlans,
  getDnaData,
  listStorageFiles,
} from '@/lib/data';
import type {
  Workstation,
  Auftrag,
  ControlPlan,
  Characteristic,
  ProcessStep,
  DNA,
  StorageFile,
} from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Diamond, AlertTriangle, Edit, List, ImageIcon, Loader2, Book, Shield, Target, LogOut, LayoutGrid, FolderKanban, Network, FileImage, StickyNote, Wrench, Siren, MoreVertical, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { DashboardClient } from '@/components/cp/DashboardClient';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ImageModal } from '@/components/cp/ImageModal';
import { useToast } from '@/hooks/use-toast';
import { generateThumbnailUrl } from '@/lib/image-utils';
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
import logo from '../Logo.png';
import { BarChartComponent } from '@/components/BarChart';
import { useIsMobile } from '@/hooks/use-mobile';


export const dynamic = 'force-dynamic';

function DnaTimeTracker({ lastTimestamp, frequency, prefix }: { lastTimestamp?: string | null, frequency?: number | null, prefix?: string }) {
    const [timeLeft, setTimeLeft] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!lastTimestamp || !frequency) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const lastCheckTime = new Date(lastTimestamp).getTime();
            const dueTime = lastCheckTime + frequency * 60 * 1000;
            const now = new Date().getTime();
            const remaining = Math.floor((dueTime - now) / (1000 * 60));
            setTimeLeft(remaining);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [lastTimestamp, frequency]);

    if (timeLeft === null) {
        return null;
    }
    
    const isOverdue = timeLeft < 0;
    const timeText = isOverdue ? `-${Math.abs(timeLeft)} min!` : `${timeLeft} min`;

    let badgeVariant: "destructive" | "secondary" | "default" = "default";
  
    if (isOverdue) {
      badgeVariant = "destructive";
    } else if (frequency && lastTimestamp) {
      const totalInterval = frequency;
      const timeElapsed = (new Date().getTime() - new Date(lastTimestamp).getTime()) / (1000 * 60);
      if ((totalInterval - timeElapsed) / totalInterval < 0.2) {
          badgeVariant = "secondary"; // Yellow-ish for last 20% of time
      }
    }

    return (
        <Badge variant={badgeVariant} className={cn(badgeVariant === 'secondary' && 'bg-amber-400/80 text-black hover:bg-amber-400/70')}>
            {prefix ? `${prefix}: ` : ''}{timeText}
        </Badge>
    );
}


function MerkmaleCardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const apId = searchParams.get('ap');
  const decodedApId = apId ? decodeURIComponent(apId) : null;
  const { user, logout, isAdmin } = useAuth();


  const [workstation, setWorkstation] = React.useState<Workstation | null>(null);
  const [auftrag, setAuftrag] = React.useState<Auftrag | null>(null);
  const [controlPlan, setControlPlan] = React.useState<ControlPlan | null>(null);
  const [processStep, setProcessStep] = React.useState<ProcessStep | null>(null);
  const [characteristics, setCharacteristics] = React.useState<Characteristic[]>([]);
  const [dnaData, setDnaData] = React.useState<DNA[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');

  const handleImageClick = (e: React.MouseEvent, url: string, alt: string) => {
    e.stopPropagation();
    e.preventDefault();
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsModalOpen(true);
  };

  React.useEffect(() => {
    if (!decodedApId) {
      setError('Kein Arbeitsplatz ausgewählt.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [workstations, auftraege, controlPlansData, allDna] = await Promise.all([
          getWorkstations(),
          getAuftraege(),
          getControlPlans(),
          getDnaData(),
        ]);

        const currentWorkstation = workstations.find((ws) => ws.AP === decodedApId);
        if (!currentWorkstation) {
          throw new Error(`Arbeitsplatz mit AP ${decodedApId} nicht gefunden.`);
        }
        setWorkstation(currentWorkstation);

        if (!currentWorkstation.POcurrent) {
          throw new Error('Am Arbeitsplatz ist kein Auftrag (PO) aktiv.');
        }

        const currentAuftrag = auftraege.find(
          (a) => a.PO === currentWorkstation.POcurrent
        );
        if (!currentAuftrag) {
           throw new Error(`Auftrag ${currentWorkstation.POcurrent} nicht gefunden.`);
        }
        setAuftrag(currentAuftrag);

        if(!currentAuftrag.CP) {
          throw new Error(
            `Kein Control Plan für Auftrag ${currentWorkstation.POcurrent} gefunden.`
          );
        }

        const currentControlPlan = controlPlansData.find(
          (cp) => cp.planNumber === currentAuftrag.CP
        );
        if (!currentControlPlan) {
          throw new Error(
            `Control Plan ${currentAuftrag.CP} konnte nicht geladen werden.`
          );
        }
        setControlPlan(currentControlPlan);

        if (!currentWorkstation.OPcurrent) {
          throw new Error(
            'Am Arbeitsplatz ist kein Prozessschritt (OP) aktiv.'
          );
        }
        
        const currentProcessStep = currentControlPlan.processSteps.find(
          (step) => step.processNumber === currentWorkstation.OPcurrent
        );
        if (!currentProcessStep) {
          throw new Error(
            `Prozessschritt ${currentWorkstation.OPcurrent} nicht im Control Plan ${currentControlPlan.planNumber} gefunden.`
          );
        }
        
        const relevantDna = allDna.filter(d => 
            d.WP === currentWorkstation.AP &&
            d.PO === currentWorkstation.POcurrent &&
            d.OP === currentWorkstation.OPcurrent
        );
        setDnaData(relevantDna);

        setProcessStep(currentProcessStep);
        setCharacteristics(currentProcessStep.characteristics);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedApId]);
  
  const formatSpec = (char: Characteristic) => {
    if (char.charType === 'A') {
      return "visual";
    }
    let spec = '';
    if (char.nominal !== undefined && char.lsl !== undefined && char.usl !== undefined) {
        spec = `${char.nominal} (${char.lsl} - ${char.usl})`;
    } else if (char.nominal !== undefined && (char.lsl !== undefined || char.usl !== undefined)) {
        spec = `${char.nominal} (${char.lsl ? `> ${char.lsl}` : ''}${char.usl ? `< ${char.usl}` : ''})`;
    } else if (char.lsl !== undefined && char.usl !== undefined) {
        spec = `${char.lsl} - ${char.usl}`;
    } else if (char.nominal !== undefined) {
        return String(char.nominal);
    } else if (char.lsl !== undefined) {
        spec = `> ${lsl}`;
    } else if (char.usl !== undefined) {
        spec = `< ${char.usl}`;
    } else {
        return 'N/A';
    }

    if(char.units) {
        spec += ` ${char.units}`;
    }
    return spec;
  }
  
  const getErfassungUrl = (char: Characteristic) => {
    if (!decodedApId || !processStep || !auftrag || !char.id) return '#';
    const baseUrl = char.charType === 'A' ? '/inputattr' : '/erfassung';
    return `${baseUrl}?ap=${encodeURIComponent(decodedApId)}&ps=${processStep.id}&char=${char.id}&po=${auftrag.PO}&op=${processStep.processNumber}&charNum=${char.itemNumber}`;
}
  
  const handleNavigateToErfassung = (e: React.MouseEvent, url: string) => {
    if ((e.target as HTMLElement).closest('a, button, [role="button"]')) {
      return;
    }
    e.preventDefault();
    if (url === '#') return;
    
    toast({
      title: (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Lade Erfassungsmaske...</span>
        </div>
      ),
      duration: 1000,
    });

    router.push(url);
  };

  const handlePointClick = (sampleId: string) => {
    if (!sampleId) return;

    if ((event?.target as HTMLElement).closest('a, button, [role="button"]')) {
      event?.preventDefault();
    }
    
    router.push(`/probe/${encodeURIComponent(sampleId)}`);
  };
  
  const getStatusColorClass = (status?: string): string => {
    if (!status) return 'text-muted-foreground';
    if (status.includes('Out of Spec')) return 'text-red-500 font-semibold';
    if (status.includes('Out of Control')) return 'text-orange-500 font-semibold';
    return 'text-green-600';
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split('?')[0]);


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
            <Link href="/" aria-label="Zur Startseite">
              <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
            </Link>
            {/* Desktop and Tablet Landscape View */}
            <div className="hidden lg:flex items-center gap-2">
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
            {/* Mobile View */}
            <div className="lg:hidden flex items-center gap-1">
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/arbeitsplaetze')}>
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/dna')}>
                    <Network className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                    <StickyNote className="mr-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/events')}>
                    <Wrench className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/incidents')}>
                    <Siren className="mr-2 h-4 w-4" />
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
                    <DropdownMenuItem onClick={() => router.push('/PO')}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>PO</span>
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
        <DashboardClient>
            <ImageModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                imageUrl={modalImageUrl}
                imageAlt={modalImageAlt}
            />
          <Card>
            <CardHeader className="bg-muted/50 rounded-t-lg">
              <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-4 flex-grow">
                      <Button variant="outline" size="icon" onClick={() => router.push('/arbeitsplaetze')}>
                          <ArrowLeft className="h-4 w-4" />
                          <span className="sr-only">Zurück zu Arbeitsplätze</span>
                      </Button>
                      {workstation?.imageUrl && (
                          <button onClick={(e) => handleImageClick(e, workstation.imageUrl!, `Bild für AP ${workstation.AP}`)} className="hidden sm:block flex-shrink-0">
                              <Image
                                  src={generateThumbnailUrl(workstation.imageUrl)}
                                  alt={`Bild für Arbeitsplatz ${workstation.AP}`}
                                  width={40}
                                  height={40}
                                  className="rounded-md object-cover aspect-square border"
                                />
                          </button>
                      )}
                      <div className='flex-grow'>
                          {isLoading ? (
                              <>
                                  <Skeleton className="h-7 w-48" />
                                  <Skeleton className="h-5 w-64 mt-2" />
                              </>
                          ) : workstation && processStep && controlPlan && auftrag ? (
                              <>
                                  <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                                      {workstation.AP}
                                      <Badge variant="outline">PO</Badge>
                                      {auftrag.PO}
                                  </CardTitle>
                                  <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                                      <Badge variant="secondary">CP</Badge>
                                      {controlPlan.planNumber}
                                      <Badge variant="secondary">OP</Badge>
                                      {processStep.processNumber}
                                  </CardDescription>
                                   {workstation.LOTcurrent && (
                                     <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                        <span><Badge variant="secondary">LOT</Badge> {workstation.LOTcurrent}</span>
                                        {workstation.Bemerkung && <span className="text-muted-foreground italic">{workstation.Bemerkung}</span>}
                                    </CardDescription>
                                  )}
                                  {processStep.remark && (
                                     <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-foreground text-base">{processStep.remark}</span>
                                    </CardDescription>
                                  )}
                              </>
                          ) : (
                              <CardTitle>Merkmalsübersicht</CardTitle>
                          )}
                      </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {auftrag?.imageUrl && (
                         isImage(auftrag.imageUrl) ? (
                            <button onClick={(e) => handleImageClick(e, auftrag!.imageUrl!, `Bild für Auftrag ${auftrag!.PO}`)} className="flex-shrink-0">
                              <Image src={generateThumbnailUrl(auftrag.imageUrl)} alt={`Bild für Auftrag ${auftrag.PO}`} width={40} height={40} className="rounded-md object-cover aspect-square border"/>
                            </button>
                         ) : (
                            <a href={auftrag.imageUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md text-muted-foreground hover:bg-muted/80 border">
                                    <LinkIcon className="h-5 w-5" />
                                </div>
                            </a>
                         )
                      )}
                      {controlPlan?.imageUrl && (
                          <button onClick={(e) => handleImageClick(e, controlPlan.imageUrl!, `Bild für CP ${controlPlan.planNumber}`)} className="flex-shrink-0">
                              <Image src={generateThumbnailUrl(controlPlan.imageUrl)} alt={`Bild für Control Plan ${controlPlan.planNumber}`} width={40} height={40} className="rounded-md object-cover aspect-square border"/>
                          </button>
                      )}
                      {processStep?.imageUrl && (
                          <button onClick={(e) => handleImageClick(e, processStep.imageUrl!, `Bild für Prozess ${processStep.processNumber}`)} className="flex-shrink-0">
                              <Image src={generateThumbnailUrl(processStep.imageUrl)} alt={`Bild für Prozess ${processStep.processNumber}`} width={40} height={40} className="rounded-md object-cover aspect-square border"/>
                          </button>
                      )}
                  </div>
              </div>
            </CardHeader>
            <CardContent className="bg-muted/30">
              {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
                 </div>
              ) : error ? (
                <div className="text-center py-10 text-red-600 bg-red-50 rounded-md">
                    <AlertTriangle className="mx-auto h-12 w-12" />
                    <h3 className="mt-2 text-lg font-medium">Fehler beim Laden der Daten</h3>
                    <p className="mt-1 text-sm">{error}</p>
                </div>
              ) : characteristics.length > 0 && processStep && auftrag && controlPlan ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {characteristics.map((char) => {
                      const dnaId = `${controlPlan.planNumber}~${processStep.processNumber}~${char.itemNumber}~${workstation!.AP}~${auftrag!.PO}`;
                      const dnaForChar = dnaData.find(d => d.idDNA === dnaId);
                      const erfassungUrl = getErfassungUrl(char);
                      const isAttributeChart = char.charType === 'A';
                       return (
                         <div 
                            key={`${processStep.id}-${char.id}`}
                            onClick={(e) => handleNavigateToErfassung(e, erfassungUrl)} 
                            className="h-full flex flex-col hover:border-primary transition-colors cursor-pointer"
                         >
                         <Card 
                            className="h-full flex flex-col hover:border-primary transition-colors cursor-pointer"
                         >
                            <CardHeader>
                                 <div className="flex items-start justify-between gap-4">
                                    <div className="flex-grow">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <span className='truncate'>{`${char.itemNumber} (${char.charType}) - ${char.DesciptionSpec}`}</span>
                                            {char.ctq && <Badge variant="outline" className='text-amber-600 border-amber-600 flex-shrink-0 ml-2'><Diamond className='w-3 h-3 mr-1'/>CTQ</Badge>}
                                        </CardTitle>
                                        <CardDescription className="text-sm">
                                            {formatSpec(char)}{char.frequency && ` / ${char.frequency} min`}
                                        </CardDescription>
                                        <CardDescription className="text-xs font-mono text-muted-foreground/80 pt-1">
                                            {dnaForChar?.idDNA}
                                        </CardDescription>
                                    </div>
                                    {char.imageUrl && (
                                         <button onClick={(e) => handleImageClick(e, char.imageUrl!, `Bild für Merkmal ${char.itemNumber}`)} className="flex-shrink-0">
                                            <Image
                                                src={generateThumbnailUrl(char.imageUrl)}
                                                alt={`Bild für Merkmal ${char.itemNumber}`}
                                                width={40}
                                                height={40}
                                                className="rounded-md object-cover aspect-square border"
                                            />
                                        </button>
                                    )}
                                 </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
                                <div className="flex flex-wrap items-center gap-2">
                                   {dnaForChar && <DnaTimeTracker lastTimestamp={dnaForChar.lastCheckTimestamp} frequency={dnaForChar.Frequency} prefix={`M# ${dnaForChar.Char}`} />}
                                   {dnaForChar?.checkStatus && <Badge variant="outline" className={cn(getStatusColorClass(dnaForChar.checkStatus))}>{dnaForChar.checkStatus}</Badge>}
                                </div>
                                {dnaForChar?.Memo && (
                                    <div className="p-2 bg-blue-100 rounded-md">
                                        <p className="text-blue-800 line-clamp-3">{dnaForChar.Memo}</p>
                                    </div>
                                )}
                                <div className="h-[200px] w-full" onClick={(e) => { if(useIsMobile()) return; e.stopPropagation();}}>
                                    {dnaForChar ? (
                                        isAttributeChart ? (
                                            <BarChartComponent dnaData={dnaForChar} onPointClick={(sampleId) => handlePointClick(sampleId)} />
                                        ) : (
                                            <SampleChart dnaData={dnaForChar} onPointClick={(sampleId) => handlePointClick(sampleId)} />
                                        )
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-gray-50 rounded-md">
                                            No DNA data for chart
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{char.sampleSize || 'N/A'}er Stichprobe</span>
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={erfassungUrl}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Erfassen
                                    </Link>
                                </Button>
                                <span>{char.gauge || 'N/A'}</span>
                            </CardFooter>
                         </Card>
                         </div>
                       )
                    })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>Für diesen Prozessschritt sind keine Merkmale definiert.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardClient>
      </main>
    </div>
  );
}

export default function MerkmalePageWrapper() {
    return (
        <React.Suspense fallback={<div className="container mx-auto p-4 md:p-8"><Skeleton className='h-96 w-full' /></div>}>
            <MerkmaleCardsPage />
        </React.Suspense>
    );
}



