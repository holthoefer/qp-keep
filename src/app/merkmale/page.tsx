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
import { ArrowLeft, Diamond, AlertTriangle, Edit, List, ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DashboardClient } from '@/components/cp/DashboardClient';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ImageModal } from '@/components/cp/ImageModal';
import { useToast } from '@/hooks/use-toast';
import { findThumbnailUrl } from '@/lib/image-utils';

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

    return (
        <Badge variant={isOverdue ? "destructive" : "default"}>
            {prefix ? `${prefix}: ` : ''}{isOverdue ? `Overdue by ${Math.abs(timeLeft)} min` : `${timeLeft} min left`}
        </Badge>
    );
}


function MiniXBarChart({ dnaData, onClick }: { dnaData: DNA | undefined, onClick: (e: React.MouseEvent) => void }) {
  if (!dnaData) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground" onClick={onClick}>
        Keine Chart-Daten
      </div>
    );
  }

  return (
    <div className="h-full w-full mt-2 p-4 flex items-center justify-center text-xs text-muted-foreground bg-gray-50 rounded-md" onClick={onClick}>
        Chart-Platzhalter
    </div>
  );
}


function MerkmaleCardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const apId = searchParams.get('ap');
  const decodedApId = apId ? decodeURIComponent(apId) : null;


  const [workstation, setWorkstation] = React.useState<Workstation | null>(null);
  const [auftrag, setAuftrag] = React.useState<Auftrag | null>(null);
  const [controlPlan, setControlPlan] = React.useState<ControlPlan | null>(null);
  const [processStep, setProcessStep] = React.useState<ProcessStep | null>(null);
  const [characteristics, setCharacteristics] = React.useState<Characteristic[]>([]);
  const [dnaData, setDnaData] = React.useState<DNA[]>([]);
  const [storageFiles, setStorageFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');

  const handleImageClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setModalImageUrl(url);
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
        const [workstations, auftraege, controlPlansData, allDna, allFiles] = await Promise.all([
          getWorkstations(),
          getAuftraege(),
          getControlPlans(),
          getDnaData(),
          listStorageFiles('uploads/'),
        ]);

        setStorageFiles(allFiles);

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
            d.PO === currentWorkstation.POcurrent && 
            d.OP === currentWorkstation.OPcurrent && 
            d.WP === currentWorkstation.AP
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
    let spec = '';
    if (char.nominal && char.lsl && char.usl) {
        spec = `${char.nominal} (${char.lsl} - ${char.usl})`;
    } else if (char.nominal && (char.lsl || char.usl)) {
        spec = `${char.nominal} (${char.lsl ? `> ${char.lsl}` : ''}${char.usl ? `< ${char.usl}` : ''})`;
    } else if (char.lsl && char.usl) {
        spec = `${char.lsl} - ${char.usl}`;
    } else if (char.nominal) {
        spec = String(char.nominal);
    } else if (char.lsl) {
        spec = `> ${char.lsl}`;
    } else if (char.usl) {
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
      if (!decodedApId || !processStep || !auftrag) return '#';
      return `/erfassung?ap=${encodeURIComponent(decodedApId)}&ps=${processStep.id}&char=${char.id}&po=${auftrag.PO}&op=${processStep.processNumber}&charNum=${char.itemNumber}`;
  }
  
  const handleNavigateToErfassung = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    if (url === '#') return;
    
    toast({
      title: (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Lade Erfassungsmaske...</span>
        </div>
      ),
      duration: 5000,
    });

    router.push(url);
  };
  
  const handleNavigate = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    toast({
      title: (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Lade Listenansicht...</span>
        </div>
      ),
      duration: 1000,
    });
    router.push(href);
  };
  
  const getStatusColorClass = (status?: string): string => {
    if (!status) return 'text-muted-foreground';
    if (status.includes('Out of Spec')) return 'text-red-500 font-semibold';
    if (status.includes('Out of Control')) return 'text-orange-500 font-semibold';
    return 'text-green-600';
  }


  return (
    <DashboardClient>
        <ImageModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            imageUrl={modalImageUrl}
            imageAlt="Merkmalbild"
        />
      <Card>
        <CardHeader className="bg-muted/50 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-64 mt-2" />
                </>
              ) : workstation && processStep && controlPlan ? (
                <>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">
                                {workstation.AP}: {controlPlan.planNumber} / {processStep.processNumber} - {processStep.machineDevice}
                            </CardTitle>
                        </div>
                        {processStep.imageUrl && (
                            <button onClick={(e) => handleImageClick(e, processStep.imageUrl!)} className="ml-4 flex-shrink-0">
                                <Image
                                    src={findThumbnailUrl(processStep.imageUrl, storageFiles)}
                                    alt={`Bild für Prozess ${processStep.processNumber}`}
                                    width={40}
                                    height={40}
                                    className="rounded-md object-cover aspect-square border"
                                />
                            </button>
                        )}
                    </div>
                </>
              ) : (
                 <>
                  <CardTitle>Merkmalsübersicht (Karten)</CardTitle>
                </>
              )}
            </div>
            <Button asChild variant="outline" size="icon" onClick={() => router.push('/arbeitsplaetze')}>
                <Link href="/arbeitsplaetze">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Zurück zu Arbeitsplätze</span>
                </Link>
            </Button>
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
          ) : characteristics.length > 0 && processStep && auftrag ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {characteristics.map((char) => {
                  const dnaForChar = dnaData.find(d => d.Char === char.itemNumber);
                  const erfassungUrl = getErfassungUrl(char);
                   return (
                   <Link key={`${processStep.id}-${char.id}`} href={erfassungUrl} onClick={(e) => handleNavigateToErfassung(e, erfassungUrl)} className="block">
                     <Card className="h-full flex flex-col hover:border-primary transition-colors cursor-pointer">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className='truncate'>{`${char.itemNumber} (${char.charType}) - ${char.DesciptionSpec}`}</span>
                                {char.ctq && <Badge variant="outline" className='text-amber-600 border-amber-600 flex-shrink-0'><Diamond className='w-3 h-3 mr-1'/>CTQ</Badge>}
                            </CardTitle>
                            <CardDescription className="text-sm">
                                {formatSpec(char)}{char.frequency && ` / ${char.frequency} min`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                               {dnaForChar && <DnaTimeTracker lastTimestamp={dnaForChar.lastCheckTimestamp} frequency={dnaForChar.Frequency} prefix={`M# ${dnaForChar.Char}`} />}
                               {dnaForChar?.checkStatus && <Badge variant="outline" className={cn(getStatusColorClass(dnaForChar.checkStatus))}>{dnaForChar.checkStatus}</Badge>}
                            </div>
                            <div className="h-[200px] w-full">
                              <MiniXBarChart dnaData={dnaForChar} onClick={(e) => e.stopPropagation()} />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{char.sampleSize || 'N/A'}er Stichprobe</span>
                            <Button variant="secondary" size="sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Erfassen
                            </Button>
                            <span>{char.gauge || 'N/A'}</span>
                        </CardFooter>
                     </Card>
                   </Link>
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
  );
}

export default function MerkmalePageWrapper() {
    return (
        <React.Suspense fallback={<div className="container mx-auto p-4 md:p-8"><Skeleton className='h-96 w-full' /></div>}>
            <MerkmaleCardsPage />
        </React.Suspense>
    );
}
