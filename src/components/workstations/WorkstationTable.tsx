

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
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { generateThumbnailUrl } from '@/lib/image-utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '../ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth-context';
import { ImageModal } from '@/components/cp/ImageModal';


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
  
  const timeText = isOverdue ? `-${Math.abs(remainingMinutes)} min!` : `${remainingMinutes} min`;

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

interface WorkstationTableProps {
    workstations: Workstation[];
    allDna: DNA[];
    onEdit: (workstation: Workstation) => void;
}


export function WorkstationTable({ workstations, allDna, onEdit }: WorkstationTableProps) {

  const router = useRouter();
  const { toast } = useToast();
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

  const handleRowClick = (ap: string) => {
    toast({
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
  
  const handleQPCheckClick = (e: React.MouseEvent, ws: Workstation) => {
    e.stopPropagation();
    if (!ws.AP || !ws.POcurrent || !ws.OPcurrent || !ws.LOTcurrent) {
      toast({
        variant: 'destructive',
        title: 'Unvollständige Daten',
        description: 'AP, PO, OP und LOT müssen am Arbeitsplatz gesetzt sein, um einen qpCheck durchzuführen.'
      });
      return;
    }
    const query = `?ap=${ws.AP}&po=${ws.POcurrent}&op=${ws.OPcurrent}&lot=${ws.LOTcurrent}`;
    router.push(`/qpchecker${query}`);
  }


  return (
    <>
      <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><Zap className="h-4 w-4 mx-auto" /></TableHead>
                         <TableHead className="w-12"></TableHead>
                        <TableHead>AP#</TableHead>
                        <TableHead className="w-[120px]">Status Zeit</TableHead>
                        <TableHead>Verletzungen</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>OP</TableHead>
                        <TableHead>LOT</TableHead>
                        <TableHead>Bemerkung</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workstations.length > 0 ? (
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
                                        <DropdownMenuItem onSelect={() => onEdit(ws)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Stammdaten bearbeiten
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => handleEventClick(e, ws.AP)}>
                                            <Wrench className="mr-2 h-4 w-4" /> Event erfassen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => handleIncidentClick(e, ws.AP, ws.POcurrent)}>
                                            <Siren className="mr-2 h-4 w-4" /> Incident melden
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => handleQPCheckClick(e, ws)}>
                                            <Zap className="mr-2 h-4 w-4" /> qpCheck durchführen
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell>
                                     <button onClick={(e) => handleWorkstationImageClick(e, ws)} className="flex-shrink-0 h-10 w-10">
                                        {ws.imageUrl ? (
                                            <Image src={generateThumbnailUrl(ws.imageUrl)} alt={`Foto für ${ws.AP}`} width={40} height={40} className="rounded-md object-cover aspect-square border" />
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md border"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                                        )}
                                    </button>
                                </TableCell>
                                <TableCell className="font-bold">{ws.AP}</TableCell>
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
                                <TableCell>{ws.POcurrent || ''}</TableCell>
                                <TableCell>{ws.OPcurrent || ''}</TableCell>
                                <TableCell>{ws.LOTcurrent || ''}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{ws.Bemerkung || ''}</TableCell>
                            </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
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
