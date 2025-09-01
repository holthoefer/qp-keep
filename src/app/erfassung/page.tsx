

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle, Diamond, Database, ImageIcon, ChevronDown, Edit, Save, FileImage, RefreshCw, X, Network, Undo, StickyNote, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getWorkstations,
  getAuftraege,
  getControlPlans,
  saveSampleData,
  getOrCreateDnaData,
  saveDnaData,
  getSample,
  getSamplesForDna,
  listStorageFiles,
} from '@/lib/data';
import type {
  Workstation,
  ControlPlan,
  Characteristic,
  ProcessStep,
  SampleData,
  Auftrag,
  DNA,
  StorageFile,
} from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { SampleChart } from '@/components/SampleChart';
import { SChart } from '@/components/SChart';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ImageModal } from '@/components/cp/ImageModal';
import { ToastAction } from '@/components/ui/toast';
import { DashboardClient } from '@/components/cp/DashboardClient';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// import ProbenPage from '@/app/proben/page';
import { cn } from '@/lib/utils';
// import { DnaTimeTracker } from '../dna/page';
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

function DnaCard({ dnaData, onSave, storageFiles }: { dnaData: DNA, onSave: (data: Partial<DNA>) => Promise<void>, storageFiles: StorageFile[] }) {
    const [isSaving, setIsSaving] = React.useState(false);
    const [formData, setFormData] = React.useState(dnaData);
    const [isCharModalOpen, setIsCharModalOpen] = React.useState(false);
    const [isSampleModalOpen, setIsSampleModalOpen] = React.useState(false);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumberField = type === 'number';
        setFormData(prev => ({ 
            ...prev, 
            [name]: isNumberField ? (value === '' ? undefined : Number(value)) : value 
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Create a copy to avoid passing functions or other non-serializable data
        const dataToSave: Partial<DNA> = {
            idDNA: formData.idDNA,
            LSL: formData.LSL,
            LCL: formData.LCL,
            CL: formData.CL,
            UCL: formData.UCL,
            USL: formData.USL,
            sUSL: formData.sUSL,
            SampleSize: formData.SampleSize,
            Frequency: formData.Frequency,
            checkStatus: formData.checkStatus,
            lastCheckTimestamp: formData.lastCheckTimestamp,
            Memo: formData.Memo,
            imageUrl: formData.imageUrl,
            imageUrlLatestSample: formData.imageUrlLatestSample,
        };

        await onSave(dataToSave);
        setIsSaving(false);
    };

    return (
        <>
            <ImageModal
                isOpen={isCharModalOpen}
                onOpenChange={setIsCharModalOpen}
                imageUrl={formData.imageUrl || ''}
                imageAlt={`Bild für Merkmal (DNA ${dnaData.idDNA})`}
            />
             <ImageModal
                isOpen={isSampleModalOpen}
                onOpenChange={setIsSampleModalOpen}
                imageUrl={formData.imageUrlLatestSample || ''}
                imageAlt={`Letztes Sample-Bild für DNA ${dnaData.idDNA}`}
            />
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="dna-item">
                    <Card>
                        <AccordionTrigger asChild>
                             <div className="flex w-full items-center justify-between cursor-pointer p-4 hover:bg-muted/30 group">
                                 <div className="flex items-center gap-4">
                                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 no-rotate" />
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-lg font-semibold">DNA:</h3>
                                        <p className="font-mono text-base text-muted-foreground">{dnaData.idDNA}</p>
                                    </div>
                                </div>
                                <DnaTimeTracker lastTimestamp={dnaData.lastCheckTimestamp} frequency={dnaData.Frequency} prefix={`M# ${dnaData.Char}`} />
                             </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <CardContent className="pt-0 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="LSL">LSL</Label>
                                        <Input id="LSL" name="LSL" type="number" step="any" value={formData.LSL ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="LCL">LCL</Label>
                                        <Input id="LCL" name="LCL" type="number" step="any" value={formData.LCL ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="CL">CL (Mittelwert)</Label>
                                        <Input id="CL" name="CL" type="number" step="any" value={formData.CL ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="UCL">UCL</Label>
                                        <Input id="UCL" name="UCL" type="number" step="any" value={formData.UCL ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="USL">USL</Label>
                                        <Input id="USL" name="USL" type="number" step="any" value={formData.USL ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sUSL">sUSL</Label>
                                        <Input id="sUSL" name="sUSL" type="number" step="any" value={formData.sUSL ?? ''} onChange={handleInputChange} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="SampleSize">Sample Size</Label>
                                        <Input id="SampleSize" name="SampleSize" type="number" value={formData.SampleSize ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="Frequency">Frequency (min)</Label>
                                        <Input id="Frequency" name="Frequency" type="number" value={formData.Frequency ?? ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="imageUrl">Image URL (Merkmal)</Label>
                                        <div className="flex items-center gap-2">
                                            {formData.imageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCharModalOpen(true)}
                                                    className="flex-shrink-0"
                                                >
                                                    <Image 
                                                        src={findThumbnailUrl(formData.imageUrl, storageFiles)} 
                                                        alt="Merkmalbild" 
                                                        width={40} 
                                                        height={40} 
                                                        className="rounded-md object-cover aspect-square border"
                                                    />
                                                </button>
                                            )}
                                            <Input id="imageUrl" name="imageUrl" value={formData.imageUrl ?? ''} onChange={handleInputChange} placeholder="https://..." className="flex-grow" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="imageUrlLatestSample">Image URL (Letztes Sample)</Label>
                                        <div className="flex items-center gap-2">
                                            {formData.imageUrlLatestSample && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSampleModalOpen(true)}
                                                    className="flex-shrink-0"
                                                >
                                                    <Image 
                                                        src={findThumbnailUrl(formData.imageUrlLatestSample, storageFiles)} 
                                                        alt="Letztes Sample Bild" 
                                                        width={40} 
                                                        height={40} 
                                                        className="rounded-md object-cover aspect-square border"
                                                    />
                                                </button>
                                            )}
                                            <Input id="imageUrlLatestSample" name="imageUrlLatestSample" value={formData.imageUrlLatestSample ?? ''} onChange={handleInputChange} placeholder="Wird automatisch gesetzt" className="flex-grow" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="Memo">Memo</Label>
                                    <Textarea id="Memo" name="Memo" value={formData.Memo ?? ''} onChange={handleInputChange} placeholder="Anmerkungen zum DNA-Datensatz..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="checkStatus">Letzter Check-Status</Label>
                                        <Input id="checkStatus" name="checkStatus" value={formData.checkStatus ?? ''} onChange={handleInputChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastCheckTimestamp">Zeitstempel letzter Check</Label>
                                        <Input id="lastCheckTimestamp" name="lastCheckTimestamp" value={formData.lastCheckTimestamp ? format(new Date(formData.lastCheckTimestamp), "yyyy-MM-dd'T'HH:mm:ss") : ''} onChange={handleInputChange} type="datetime-local" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? 'Speichern...' : 'DNA Speichern'}
                                </Button>
                            </CardFooter>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
        </>
    );
}

function ProcessStepCard({ processStep, onImageClick, storageFiles }: { processStep: ProcessStep | null, onImageClick: (url: string, alt: string) => void, storageFiles: StorageFile[] }) {
    if (!processStep) return null;
    return (
        <Card className="bg-muted/50">
            <CardHeader className="flex flex-row justify-between items-start gap-4">
                 <div className="flex-grow">
                    <CardTitle className="text-base">{processStep.processNumber}{processStep.processName && ` - ${processStep.processName}`}</CardTitle>
                    <CardDescription className="text-xs">
                        {processStep.processDescription || 'Keine Beschreibung'}
                    </CardDescription>
                </div>
                 {processStep.imageUrl && (
                    <button type="button" onClick={() => onImageClick(processStep.imageUrl!, `Bild für ${processStep.processNumber}`)} className="w-16 h-16 flex-shrink-0">
                        <Image
                            src={findThumbnailUrl(processStep.imageUrl, storageFiles)}
                            alt={`Bild für ${processStep.processNumber}`}
                            width={64}
                            height={64}
                            className="rounded-md object-cover aspect-square border"
                        />
                    </button>
                )}
            </CardHeader>
            <CardContent>
                 <div className="space-y-2 text-sm">
                    <div>
                        <p className="text-muted-foreground text-xs">Maschine/Gerät</p>
                        <p className="font-medium">{processStep.machineDevice || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Bemerkung</p>
                        <p className="font-medium">{processStep.remark || 'N/A'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ControlPlanCard({ controlPlan, onImageClick, storageFiles }: { controlPlan: ControlPlan | null, onImageClick: (url: string, alt: string) => void, storageFiles: StorageFile[] }) {
    if (!controlPlan) return null;
    return (
        <Card className="bg-muted/50">
            <CardHeader className="flex flex-row justify-between items-start gap-4">
                 <div className="flex-grow">
                    <CardTitle className="text-base">Control Plan: {controlPlan.planNumber}</CardTitle>
                    <CardDescription className="text-xs">
                        {controlPlan.partName} ({controlPlan.partNumber})
                    </CardDescription>
                </div>
                {controlPlan.imageUrl && (
                    <button type="button" onClick={() => onImageClick(controlPlan.imageUrl!, `Bild für ${controlPlan.planNumber}`)} className="w-16 h-16 flex-shrink-0">
                        <Image
                            src={findThumbnailUrl(controlPlan.imageUrl, storageFiles)}
                            alt={`Bild für ${controlPlan.planNumber}`}
                            width={64}
                            height={64}
                            className="rounded-md object-cover aspect-square border"
                        />
                    </button>
                )}
            </CardHeader>
             <CardContent>
                 <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{controlPlan.planDescription || 'Keine Beschreibung vorhanden.'}</p>
                    <div>
                       <p className="text-muted-foreground text-xs">Allgemeine Informationen</p>
                       <p className="font-medium">{controlPlan.generalInformation || 'N/A'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ErfassungPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const apId = searchParams.get('ap');
  const decodedApId = apId ? decodeURIComponent(apId) : null;
  const po = searchParams.get('po');
  const opNum = searchParams.get('op');
  const charNum = searchParams.get('charNum');
  
  const psId = searchParams.get('ps');
  const charId = searchParams.get('char');


  const [workstation, setWorkstation] = React.useState<Workstation | null>(null);
  const [auftrag, setAuftrag] = React.useState<Auftrag | null>(null);
  const [controlPlan, setControlPlan] = React.useState<ControlPlan | null>(null);
  const [characteristic, setCharacteristic] = React.useState<Characteristic | null>(null);
  const [processStep, setProcessStep] = React.useState<ProcessStep | null>(null);
  const [dnaData, setDnaData] = React.useState<DNA | null>(null);
  const [storageFiles, setStorageFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sampleInput, setSampleInput] = React.useState('');
  const [sampleNote, setSampleNote] = React.useState('');
  const [chartRefreshKey, setChartRefreshKey] = React.useState(0);
  
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');
  
  
  // Single Source of Truth for required sample size
  const requiredSampleSize = React.useMemo(() => {
    if (!dnaData || typeof dnaData.SampleSize !== 'number') return 0;
    return dnaData.SampleSize;
  }, [dnaData]);
  
  const currentValues = React.useMemo(() => {
    return sampleInput.split(/[\s\n]+/).filter(v => v.trim() !== '' && !isNaN(parseFloat(v)));
  }, [sampleInput]);

  const isSaveDisabled = React.useMemo(() => {
    if (isSaving) return true;
    
    const numValues = currentValues.length;

    if (requiredSampleSize > 0) {
        // If a specific size is required, number of values must match exactly
        return numValues !== requiredSampleSize;
    }
    
    // If no specific size is required, allow saving if at least one value is present
    return numValues === 0;
  }, [isSaving, currentValues.length, requiredSampleSize]);

  const inputPlaceholder = requiredSampleSize > 0 ? `${requiredSampleSize} Werte eingeben...` : 'Werte eingeben...';


  const handlePointClick = (sampleId: string, isLatest: boolean) => {
    const url = `/probe/${encodeURIComponent(sampleId)}${isLatest ? '?new=true' : ''}`;
    
    toast({
      title: (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Lade Bild & Notiz...</span>
        </div>
      ),
      duration: 3000, 
    });
    router.push(url);
  };

  const fetchDna = React.useCallback(async () => {
    if (workstation && auftrag && processStep && characteristic) {
      const dna = await getOrCreateDnaData(workstation, auftrag, processStep, characteristic);
      setDnaData(dna);
    }
  }, [workstation, auftrag, processStep, characteristic]);

  const refreshAllData = React.useCallback(() => {
    fetchDna();
    setChartRefreshKey(prev => prev + 1);
  }, [fetchDna]);

  React.useEffect(() => {
    if (!decodedApId || !po || (!psId && !opNum) || (!charId && !charNum)) {
      setError('Fehlende Parameter in der URL.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [workstations, auftraege, controlPlans, allFiles] = await Promise.all([
          getWorkstations(),
          getAuftraege(),
          getControlPlans(),
          listStorageFiles('uploads/'),
        ]);

        setStorageFiles(allFiles);

        const currentWorkstation = workstations.find((ws) => ws.AP === decodedApId);
        if (!currentWorkstation) {
          throw new Error(`Arbeitsplatz mit AP ${decodedApId} nicht gefunden.`);
        }
        setWorkstation(currentWorkstation);

        const currentAuftrag = auftraege.find((a) => a.PO === po);
        if (!currentAuftrag || !currentAuftrag.CP) {
          throw new Error(`Kein Control Plan für Auftrag ${po} gefunden.`);
        }
        
        const currentControlPlan = controlPlans.find(
          (cp) => cp.planNumber === currentAuftrag.CP
        );
        if (!currentControlPlan) {
          throw new Error(
            `Control Plan ${currentAuftrag.CP} konnte nicht geladen werden.`
          );
        }
        setControlPlan(currentControlPlan);
        setAuftrag(currentAuftrag);


        const currentProcessStep = currentControlPlan.processSteps.find(
          (step) => step.id === psId || step.processNumber === opNum
        );
        if (!currentProcessStep) {
          throw new Error(
            `Prozessschritt ${psId || opNum} nicht im Control Plan gefunden.`
          );
        }
        setProcessStep(currentProcessStep);

        const currentCharacteristic = currentProcessStep.characteristics.find(
          (char) => char.id === charId || char.itemNumber === charNum
        );
        if (!currentCharacteristic) {
          throw new Error(`Merkmal ${charId || charNum} nicht im Prozessschritt gefunden.`);
        }
        setCharacteristic(currentCharacteristic);

        const dna = await getOrCreateDnaData(currentWorkstation, currentAuftrag, currentProcessStep, currentCharacteristic);
        setDnaData(dna);


      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [decodedApId, psId, charId, po, opNum, charNum]);
  
  const handleSampleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;

    let sanitizedValue = value
        .replace(/(\d),(\d)/g, '$1.$2')
        .replace(/[,\/\\;a-zA-Z]/g, '\n'); 
    
    setSampleInput(sanitizedValue);
    
    const values = sanitizedValue.split(/[\s\n]+/).filter(v => v.trim() !== '' && !isNaN(parseFloat(v)));
    
    if (requiredSampleSize > 0 && values.length > requiredSampleSize) {
        toast({
            variant: "destructive",
            title: 'Zu viele Werte',
            description: `Es werden nur ${requiredSampleSize} Werte benötigt. Bitte korrigieren Sie die Eingabe.`,
            duration: 2000,
        });
    }
  };
  
  const checkForExceptions = (values: number[], mean: number, stddev: number, dna: DNA): { text: string | null; variant: 'destructive' | 'warning' | null } => {
    const { LCL, UCL, LSL, USL, sUSL } = dna;

    for (const value of values) {
        if (USL !== undefined && USL !== null && value > USL) {
            return { text: `Out of Spec (High): Wert ${value}`, variant: 'destructive' };
        }
        if (LSL !== undefined && LSL !== null && value < LSL) {
            return { text: `Out of Spec (Low): Wert ${value}`, variant: 'destructive' };
        }
    }

    if (UCL !== undefined && UCL !== null && mean > UCL) {
        return { text: `UCL-Verletzung: MW ${mean.toFixed(4)}`, variant: 'warning' };
    }
    if (LCL !== undefined && LCL !== null && mean < LCL) {
        return { text: `LCL-Verletzung: MW ${mean.toFixed(4)}`, variant: 'warning' };
    }
    if (sUSL !== undefined && sUSL !== null && stddev > sUSL) {
        return { text: `sUSL-Verletzung: StdAbw ${stddev.toFixed(4)}`, variant: 'warning' };
    }

    return { text: null, variant: null };
  };
  
  const handleSave = async () => {
    if (!sampleInput || !workstation || !characteristic || !po || !dnaData) {
        toast({ title: "Fehler", description: "Nicht alle benötigten Daten sind vorhanden.", variant: 'destructive' });
        return;
    }

    if (!characteristic.id) {
        toast({ title: "Fehler", description: "Das Merkmal hat keine gültige ID. Bitte speichern Sie zuerst den Control Plan.", variant: 'destructive' });
        return;
    }

    const values = currentValues.map(parseFloat);

    if (values.some(isNaN)) {
        toast({ title: "Eingabefehler", description: "Die Eingabe enthält ungültige Zeichen. Bitte nur Zahlen und unterstützte Trennzeichen verwenden.", variant: 'destructive' });
        return;
    }
     if (values.length === 0) {
        toast({ title: "Keine Werte", description: "Bitte geben Sie mindestens einen Wert ein.", variant: 'destructive' });
        return;
    }
    
    setIsSaving(true);
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const stddev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (values.length > 1 ? values.length -1 : 1));
    const exception = checkForExceptions(values, mean, stddev, dnaData);

    let finalNote = sampleNote.trim();
    if (exception.text) {
        const separator = finalNote ? '\n' : '';
        finalNote = `${finalNote}${separator}${exception.text}`;
    }

    const sampleData: Omit<SampleData, 'id'> = {
        workstationId: workstation.AP,
        characteristicId: characteristic.id,
        po: po,
        lot: workstation.LOTcurrent || 'N/A',
        mean,
        stddev,
        timestamp: new Date().toISOString(),
        values: values,
        dnaId: dnaData.idDNA,
        note: finalNote,
        exception: !!exception.text,
    };

    try {
        const savedSample = await saveSampleData(sampleData, undefined, true);
        
        const toastVariant = exception.text ? (exception.variant || 'warning') : 'default';
        const toastTitle = exception.text ? 'Grenzwertverletzung!' : 'Stichprobe gespeichert';
        const toastDescription = exception.text ? exception.text : `Mittelwert: ${mean.toFixed(4)}`;
        const toastDuration = exception.text ? 4000 : 2000;
        
        toast({
            title: toastTitle,
            description: toastDescription,
            variant: toastVariant as "default" | "destructive" | "warning",
            duration: toastDuration,
            action: (
              <ToastAction altText="Notiz/Bild bearbeiten" onClick={() => handlePointClick(savedSample.id, true)}>
                Notiz/Bild bearbeiten
              </ToastAction>
            ),
        });
        
        if (savedSample.dnaId) {
            const updatedDna = await getOrCreateDnaData(workstation, { PO: po, CP: dnaData.CP, Anmerkung: sampleNote, id: po, imageUrl: '' }, processStep!, characteristic);
            setDnaData(updatedDna);
        }

        setSampleInput('');
        setSampleNote('');
        refreshAllData();

    } catch(e: any) {
        toast({ title: "Fehler beim Speichern", description: e.message, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
    const handleDnaSave = async (dataToSave: Partial<DNA>) => {
        if (!dnaData) return;
        try {
            const updatedDna = await saveDnaData({ ...dataToSave, idDNA: dnaData.idDNA });
            setDnaData(updatedDna);
            setChartRefreshKey(prev => prev + 1);
        } catch(e: any) {
            toast({ title: "Fehler beim Speichern der DNA", description: e.message, variant: 'destructive' });
        }
    };
    
    const formatSpec = (char: Characteristic | null) => {
        if (!char) return 'N/A';
        let spec = '';
        const nominal = char.nominal !== undefined ? char.nominal : '';
        const lsl = char.lsl !== undefined ? char.lsl : '';
        const usl = char.usl !== undefined ? char.usl : '';
    
        if (nominal !== '' && lsl !== '' && usl !== '') {
            spec = `${nominal} (${lsl} - ${usl})`;
        } else if (nominal !== '' && (lsl !== '' || usl !== '')) {
            spec = `${nominal} (${lsl ? `> ${lsl}` : ''}${usl ? `< ${usl}` : ''})`;
        } else if (lsl !== '' && usl !== '') {
            spec = `${lsl} - ${usl}`;
        } else if (nominal !== '') {
            return String(nominal);
        } else if (lsl !== '') {
            spec = `> ${lsl}`;
        } else if (usl !== '') {
            spec = `< ${usl}`;
        } else {
            return 'N/A';
        }

        if(char.units) {
            spec += ` ${char.units}`;
        }
        return spec;
    };
    
    const textareaRows = requiredSampleSize > 0 ? Math.max(requiredSampleSize + 1, 3) : 3;

    const handleImageClick = (url: string, alt: string) => {
        setModalImageUrl(url);
        setIsImageModalOpen(true);
    };

    const handleOpenLastNote = async () => {
        if (!dnaData) {
            toast({ variant: "destructive", title: "Fehler", description: "DNA-Daten nicht geladen." });
            return;
        }
        try {
            const samples = await getSamplesForDna(dnaData.idDNA, 1);
            if (samples.length > 0) {
                const lastSampleId = samples[0].id;
                handlePointClick(lastSampleId, true);
            } else {
                toast({ title: "Keine Stichproben", description: "Für dieses Merkmal existieren noch keine Stichproben." });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Fehler", description: "Letzte Stichprobe konnte nicht geladen werden." });
        }
    };

  return (
    <DashboardClient>
      <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
     
      <div className="flex items-center justify-between flex-wrap gap-2 mt-2 md:mt-0">
        <Button
            variant="outline"
            onClick={() => router.back()}
            size="icon"
        >
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
            {dnaData && (
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/proben?dnaId=${encodeURIComponent(dnaData.idDNA)}`}>
                        <Database className="mr-2 h-4 w-4" />
                        Data
                    </Link>
                </Button>
            )}
            <Button onClick={handleOpenLastNote} variant="secondary" size="sm" disabled={!dnaData}>
                <StickyNote className="mr-2 h-4 w-4" />
                +Note
            </Button>
             <Button onClick={refreshAllData} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
         </div>
      </div>

    <div className="mt-0">
      <Card>
        <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-4 relative">
              <div className="flex-grow">
                 <div className="text-sm font-mono break-all pr-14">
                    {isLoading ? <Skeleton className="h-5 w-72" /> : 
                        <>
                           {dnaData?.idDNA}
                        </>
                    }
                </div>
                <div className="text-sm text-muted-foreground pt-0.5">
                  {dnaData ? (
                     <>
                       <b>{requiredSampleSize > 0 ? `${requiredSampleSize}er` : 'N/A'}</b> Stichprobe
                     </>
                  ) : (
                    <div className="pt-0.5">
                        <Skeleton className="h-4 w-32" />
                    </div>
                  )}
                </div>
              </div>
                {characteristic?.imageUrl && (
                    <div className="absolute top-0 right-0 flex-shrink-0">
                        <button type="button" onClick={() => handleImageClick(characteristic.imageUrl!, `Bild für Merkmal ${characteristic.DesciptionSpec}`)} className="w-16 h-16">
                            <Image 
                                src={findThumbnailUrl(characteristic.imageUrl, storageFiles)} 
                                alt="Merkmalbild" 
                                width={64} 
                                height={64} 
                                className="rounded-md object-cover aspect-square border"
                            />
                        </button>
                    </div>
                )}
            </div>
             {workstation?.LOTcurrent && <p className="text-xs text-muted-foreground mt-2">Charge: {workstation.LOTcurrent}</p>}
        </CardHeader>
        <CardContent className="pt-1 pb-4">
          {isLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : characteristic ? (
            <div className='space-y-2'>
                <Accordion type="multiple" className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-left flex-wrap">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                <span className="font-bold text-lg">{characteristic.itemNumber} ({characteristic.charType})</span>
                                <span className="text-lg">{characteristic.DesciptionSpec}</span>
                                <span className="text-muted-foreground">{formatSpec(characteristic)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                        <div className="p-4 bg-muted/50 rounded-md text-sm space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4">
                                    <p><strong>Spezifikation:</strong> {formatSpec(characteristic)}</p>
                                    <p><strong>Messmittel:</strong> {characteristic.gauge || 'N/A'}</p>
                                    <p><strong>Stichprobengröße:</strong> {dnaData?.SampleSize || 'N/A'}</p>
                                    <p><strong>Frequenz:</strong> {dnaData?.Frequency || 'N/A'}</p>
                                    <p><strong>Product Char:</strong> {characteristic.product || 'N/A'}</p>
                                    <p><strong>Process Char:</strong> {characteristic.process || 'N/A'}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 pt-2 border-t">
                                    <div className='flex items-center gap-2'>
                                    <strong>CTQ:</strong>
                                    {characteristic.ctq ? <Badge variant="outline" className='text-amber-600 border-amber-600'><Diamond className='w-3 h-3 mr-1'/>Ja</Badge> : 'Nein'}
                                    </div>
                                    <p><strong>Control Method:</strong> {characteristic.controlMethod || 'N/A'}</p>
                                    <p><strong>Reaction Plan:</strong> {characteristic.reactionPlan || 'N/A'}</p>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {characteristic.Instruction && (
                    <p className="text-sm pt-1">
                        <strong className="font-medium">Instruktion: </strong>
                        <span className="text-muted-foreground">{characteristic.Instruction}</span>
                    </p>
                )}

                <div className="grid grid-cols-2 gap-x-4 items-start pt-2">
                    <Textarea 
                        id="sample-input"
                        value={sampleInput}
                        onChange={handleSampleInputChange}
                        placeholder={inputPlaceholder}
                        rows={textareaRows}
                        style={{ height: `${textareaRows * 1.5 + 1}rem`}}
                    />
                    <div className="flex flex-col h-full">
                        <Textarea 
                            id="sample-note"
                            value={sampleNote}
                            onChange={(e) => setSampleNote(e.target.value)}
                            placeholder="Note..."
                            className="flex-grow"
                        />
                         <Button onClick={handleSave} disabled={isSaveDisabled} className="mt-2 w-full">
                            <Save className="mr-2 h-4 w-4" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>
          ) : (
             <div className="text-center py-10 text-muted-foreground">Keine Daten zum Anzeigen.</div>
          )}
        </CardContent>
      </Card>
      
      <div className='space-y-px mt-2'>
          {dnaData && (
            <Card>
              <CardHeader className='p-4'>
                
              </CardHeader>
              <CardContent className="h-[225px] w-full p-2">
                <SampleChart key={chartRefreshKey} dnaData={dnaData} onPointClick={handlePointClick} />
              </CardContent>
            </Card>
          )}

          {dnaData && (
            <Card>
              <CardHeader className='p-4 pb-0'>
                <CardTitle className="text-lg">s-Chart</CardTitle>
              </CardHeader>
              <CardContent className="h-[150px] w-full p-2">
                <SChart key={chartRefreshKey} dnaData={dnaData} onPointClick={handlePointClick} />
              </CardContent>
            </Card>
          )}
      </div>

       <div className="mt-4 pt-4 space-y-4">
          {dnaData && <DnaCard dnaData={dnaData} onSave={handleDnaSave} storageFiles={storageFiles} />}
          <ProcessStepCard processStep={processStep} onImageClick={handleImageClick} storageFiles={storageFiles} />
          <ControlPlanCard controlPlan={controlPlan} onImageClick={handleImageClick} storageFiles={storageFiles} />
      </div>
    </div>
    </DashboardClient>
  );
}

export default function ErfassungPageWrapper() {
    return (
        <React.Suspense fallback={<div className="container mx-auto p-4 md:p-8"><Skeleton className='h-96 w-full' /></div>}>
            <ErfassungPage />
        </React.Suspense>
    );
}

```
- `src/components/SampleChart.tsx`:
```tsx
'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer, TooltipProps, Dot, Label } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data: SampleData = payload[0].payload;
    const note = data.note || '';
    
    // Wrap note text
    const noteLines = [];
    if (note) {
        for (let i = 0; i < note.length; i += 20) {
            noteLines.push(note.substring(i, i + 20));
        }
    }
    
    return (
      <div className="bg-background border border-border p-2 rounded-md shadow-lg text-xs">
        <p className="font-bold">{`Mittelwert: ${payload[0].value}`}</p>
        <p className="text-muted-foreground">{format(new Date(data.timestamp), 'dd.MM.yyyy HH:mm:ss')}</p>
        {data.values && <p className="text-muted-foreground mt-1">Werte: {data.values.join('; ')}</p>}
        {note && (
            <div className="text-muted-foreground mt-1">
                Notiz:
                {noteLines.map((line, index) => <p key={index} className="pl-2">{line}</p>)}
            </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props: any) => {
  const { cx, cy, payload, dnaData } = props;

  const { mean, note, imageUrl } = payload;
  const { LSL, USL, LCL, UCL } = dnaData;

  let fill = "#8884d8"; // Default color
  
  if ((USL !== undefined && USL !== null && mean > USL) || (LSL !== undefined && LSL !== null && mean < LSL)) {
    fill = "red";
  } else if ((UCL !== undefined && UCL !== null && mean > UCL) || (LCL !== undefined && LCL !== null && mean < LCL)) {
    fill = "orange";
  }
  
  const hasExtraInfo = note || imageUrl;

  return (
    <g>
        <Dot cx={cx} cy={cy} r={3} fill={fill} />
        {hasExtraInfo && (
            <Dot cx={cx} cy={cy} r={7} fill="none" stroke={fill} strokeWidth={1} />
        )}
    </g>
  );
};


interface SampleChartProps {
    dnaData: DNA;
    onPointClick: (sampleId: string, isLatest: boolean) => void;
}

export function SampleChart({ dnaData, onPointClick }: SampleChartProps) {
    const [data, setData] = React.useState<SampleData[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!dnaData.idDNA) return;
            setIsLoading(true);
            try {
                const samples = await getSamplesForDna(dnaData.idDNA, 50);
                setData(samples);
            } catch (error) {
                console.error("Failed to fetch samples for chart", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [dnaData.idDNA]);

    const formattedData = React.useMemo(() => data.map(sample => ({
        ...sample,
        name: new Date(sample.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        mean: parseFloat(sample.mean.toFixed(4)),
    })), [data]);

    const yAxisDomain = React.useMemo(() => {
        const allValues = formattedData.map(d => d.mean);
        if (dnaData.LSL !== undefined && dnaData.LSL !== null) allValues.push(dnaData.LSL);
        if (dnaData.USL !== undefined && dnaData.USL !== null) allValues.push(dnaData.USL);
        if (allValues.length === 0) return ['auto', 'auto'];
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1 || 1;
        
        return [min - padding, max + padding];
    }, [formattedData, dnaData.LSL, dnaData.USL]);

    const yAxisTickFormatter = (value: number) => {
        if (Math.abs(value) < 0.01 && value !== 0) {
            return value.toExponential(1);
        }
        return value.toFixed(2);
    };


    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }
    
    const handleChartClick = (e: any) => {
        if (e && e.activePayload && e.activePayload.length > 0) {
            const sampleId = e.activePayload[0].payload.id;
            const isLatest = e.activePayload[0].payload.id === data[data.length -1]?.id;
            onPointClick(sampleId, isLatest);
        }
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis domain={yAxisDomain} style={{ fontSize: '12px' }} width={50} tickFormatter={yAxisTickFormatter} />
                <Tooltip content={<CustomTooltip />} />
                
                {dnaData.USL !== undefined && dnaData.USL !== null && (
                    <ReferenceLine y={dnaData.USL} stroke="red" strokeDasharray="3 3" ifOverflow="visible">
                       <Label value="USL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.UCL !== undefined && dnaData.UCL !== null && (
                    <ReferenceLine y={dnaData.UCL} stroke="red" strokeWidth={1.5} ifOverflow="visible">
                        <Label value="UCL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.CL !== undefined && dnaData.CL !== null && (
                    <ReferenceLine y={dnaData.CL} stroke="grey" ifOverflow="visible">
                        <Label value="CL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.LCL !== undefined && dnaData.LCL !== null && (
                     <ReferenceLine y={dnaData.LCL} stroke="red" strokeWidth={1.5} ifOverflow="visible">
                        <Label value="LCL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.LSL !== undefined && dnaData.LSL !== null && (
                    <ReferenceLine y={dnaData.LSL} stroke="red" strokeDasharray="3 3" ifOverflow="visible">
                         <Label value="LSL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                
                <Line type="linear" dataKey="mean" stroke="#8884d8" dot={<CustomizedDot dnaData={dnaData} />} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

```