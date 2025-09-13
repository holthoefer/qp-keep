

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

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Workstation, Auftrag, ControlPlan, ProcessStep, DNA } from '@/types';

import { Pencil, Image as ImageIcon, Wrench, Siren, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { generateThumbnailUrl } from '@/lib/image-utils';
import { useAuth } from '@/hooks/use-auth-context';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const NextCheckBadge = ({ dna, onClick }: { dna: DNA; onClick: () => void }) => {
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

  const timeText = isOverdue ? `-${Math.abs(remainingMinutes)}min!` : `${remainingMinutes} min`;

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

interface WorkstationGridProps {
    workstations: Workstation[];
    allDna: DNA[];
    onEdit: (workstation: Workstation) => void;
}


export function WorkstationGrid({ workstations, allDna, onEdit }: WorkstationGridProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');

  const handleImageClick = (e: React.MouseEvent, url: string, alt: string) => {
    e.stopPropagation();
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsImageModalOpen(true);
  };
  
  const handleWorkstationImageClick = (e: React.MouseEvent, workstation: Workstation) => {
    e.stopPropagation();
    if (isAdmin) {
      router.push(`/arbeitsplatz/${workstation.AP}`);
    } else if (workstation.imageUrl) {
      handleImageClick(e, workstation.imageUrl, `Vollbildansicht für ${workstation.AP}`);
    }
  }

  const getErfassungUrl = (dna: DNA) => {
      if (!dna.WP || !dna.PO || !dna.OP || !dna.Char) {
          return '#';
      }
      const baseUrl = dna.charType === 'A' ? '/inputattr' : '/erfassung';
      return `${baseUrl}?ap=${dna.WP}&po=${dna.PO}&op=${dna.OP}&charNum=${dna.Char}`;
  }

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
      duration: 1000, 
    });
    
    router.push(`/merkmale?ap=${encodeURIComponent(ap)}`);
  };

  const handleEditFieldClick = (e: React.MouseEvent, workstation: Workstation) => {
    e.stopPropagation();
    onEdit(workstation);
  };
  
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
      <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
      <div className="bg-muted/30 p-2 rounded-lg">
          {workstations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {workstations.map((ws) => {
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
                  <Card key={ws.AP} className="flex flex-col hover:border-primary transition-colors cursor-pointer" onClick={(e) => handleCardClick(e, ws.AP)}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="group flex-1">
                              <CardTitle className="group-hover:text-primary transition-colors">{ws.AP}</CardTitle>
                              <CardDescription>{ws.Beschreibung}</CardDescription>
                          </div>
                           <button
                                onClick={(e) => handleWorkstationImageClick(e, ws)}
                                className="flex-shrink-0 h-12 w-12"
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
                              {nextDueDna && <NextCheckBadge dna={nextDueDna} onClick={() => router.push(getErfassungUrl(nextDueDna!))} />}
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary">PO</Badge>
                                  <span className="text-left">{ws.POcurrent || ''}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary">OP</Badge>
                                  <span className="text-left">{ws.OPcurrent || ''}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <Badge variant="secondary">LOT</Badge>
                                  <span className="text-left">{ws.LOTcurrent || ''}</span>
                              </div>
                               {ws.Bemerkung && <p className="text-xs text-muted-foreground pt-1">{ws.Bemerkung}</p>}
                               {exceptionDnas.length > 0 && (
                                   <div className="pt-2 space-y-1">
                                       {exceptionDnas.map(dna => (
                                           <Button
                                                key={dna.idDNA}
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto p-0"
                                                onClick={() => router.push(getErfassungUrl(dna))}
                                            >
                                               <Badge variant="destructive" className="cursor-pointer">
                                                   <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                                                   M#{dna.Char}: {dna.checkStatus}
                                               </Badge>
                                           </Button>
                                       ))}
                                   </div>
                               )}
                          </div>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                           <div className="flex items-center gap-1">
                               <Button variant="outline" size="sm" onClick={(e) => handleEventClick(e, ws.AP)}>
                                   <Wrench className="h-4 w-4" />
                               </Button>
                               <Button variant="outline" size="sm" onClick={(e) => handleIncidentClick(e, ws.AP, ws.POcurrent)}>
                                   <Siren className="h-4 w-4" />
                               </Button>
                           </div>
                           <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={(e) => handleEditFieldClick(e, ws)} className='ml-auto'>
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Stammdaten bearbeiten</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Stammdaten bearbeiten</p>
                                </TooltipContent>
                            </Tooltip>
                           </TooltipProvider>
                      </CardFooter>
                  </Card>
              )})}
            </div>
          ) : (
              <div className="text-center py-10 text-gray-500">
                  <p>Keine Arbeitsplätze gefunden.</p>
              </div>
          )}
      </div>
    </>
  );
}
