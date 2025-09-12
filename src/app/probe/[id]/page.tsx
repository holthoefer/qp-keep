

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getSample, saveSampleData, getAppStorage, getDnaData, getControlPlan, getSamplesForDna } from '@/lib/data';
import type { SampleData, DNA, ControlPlan, ProcessStep, Characteristic } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UploadCloud, Save, ArrowLeft, X, Copy, Trash2, Wand2, Loader2, Send, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { suggestResponsePlan } from '@/ai/flows/suggest-response-plan';
import { SampleChart } from '@/components/SampleChart';
import { SChart } from '@/components/SChart';
import { generateThumbnailUrl } from '@/lib/image-utils';


interface AnalysisResultDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading: boolean;
    analysisResult: string | null;
    htmlSkeleton: string | null;
    error: string | null;
    dnaData: DNA | null;
    sample: SampleData | null;
    historicalSamples: SampleData[];
    onCombinedExport: () => void;
}

const AnalysisResultDialog: React.FC<AnalysisResultDialogProps> = ({ isOpen, onOpenChange, isLoading, analysisResult, htmlSkeleton, error, dnaData, sample, historicalSamples, onCombinedExport }) => {

    const handlePointClick = (sampleId: string, isLatest: boolean) => {
        // Dummy handler, as this is a display-only chart inside the dialog
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>AI-Analyse und Regelkarten</DialogTitle>
                    <DialogDescription>
                        Hier ist die von der KI generierte Analyse zusammen mit den relevanten Regelkarten.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-6">
                    <div className="space-y-4">
                        <Card>
                             <CardHeader>
                                {sample && <p className="text-xs text-muted-foreground font-mono pb-2">ID: {sample.dnaId}_{sample.timestamp}</p>}
                                <CardTitle className="text-lg">Analyse &amp; Maßnahmen</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading && <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><p>Analyse wird geladen...</p></div>}
                                {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Fehler</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                                {analysisResult && (
                                     <div dangerouslySetInnerHTML={{ __html: analysisResult }} className="prose dark:prose-invert max-w-none text-sm [&_h3]:mb-2 [&_h3]:font-semibold [&_ul]:pl-5 [&_li]:mb-1" />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-4">
                        {dnaData && dnaData.charType !== 'A' && (
                            <>
                                <Card>
                                  <CardHeader className='p-4'>
                                    <CardTitle className="text-lg">x̄-Chart</CardTitle>
                                  </CardHeader>
                                  <CardContent className="h-[250px] w-full p-2">
                                    <SampleChart dnaData={dnaData} onPointClick={handlePointClick} />
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardHeader className='p-4'>
                                    <CardTitle className="text-lg">s-Chart</CardTitle>
                                  </CardHeader>
                                  <CardContent className="h-[200px] w-full p-2">
                                    <SChart dnaData={dnaData} onPointClick={handlePointClick} />
                                  </CardContent>
                                </Card>
                            </>
                        )}
                        {sample && (
                            <Card>
                                <CardContent className="pt-4 text-sm">
                                    <p><strong>Zeitstempel:</strong> {new Date(sample.timestamp).toLocaleString()}</p>
                                    {sample.note && <p className="mt-2"><strong>Notiz:</strong> {sample.note}</p>}
                                     {sample.imageUrl && (
                                        <div className="mt-2">
                                            <Image src={generateThumbnailUrl(sample.imageUrl)} alt="Stichprobenbild" width={200} height={200} className="rounded-md object-cover" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
                 <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCombinedExport} disabled={!analysisResult || !htmlSkeleton}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Kombinierten Report exportieren
                    </Button>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Schließen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


interface SampleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SampleDetailPage({ params }: SampleDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { id: encodedSampleId } = React.use(params);
  const sampleId = decodeURIComponent(encodedSampleId);
  const isNewSample = searchParams.get('new') === 'true';

  const [sample, setSample] = React.useState<SampleData | null>(null);
  const [dna, setDna] = React.useState<DNA | null>(null);
  const [controlPlan, setControlPlan] = React.useState<ControlPlan | null>(null);
  const [originalData, setOriginalData] = React.useState<{imageUrl: string; note: string} | null>(null);
  const [historicalSamples, setHistoricalSamples] = React.useState<SampleData[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [imageUrl, setImageUrl] = React.useState('');
  const [note, setNote] = React.useState('');
  const [updateDna, setUpdateDna] = React.useState(isNewSample);

  const [hasImageError, setHasImageError] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isBackAlertOpen, setIsBackAlertOpen] = React.useState(false);
  const [justUploaded, setJustUploaded] = React.useState(false);

  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = React.useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const [htmlSkeleton, setHtmlSkeleton] = React.useState<string | null>(null);


  const isDirty = originalData ? (imageUrl !== originalData.imageUrl || note !== originalData.note) : false;

  React.useEffect(() => {
    if (!sampleId) {
      setError('Keine Stichproben-ID gefunden.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setUploadError(null);
      setError(null);
      try {
        const sampleData = await getSample(sampleId);
        if (!sampleData) {
          throw new Error(`Stichprobe mit ID ${sampleId} nicht gefunden.`);
        }
        setSample(sampleData);
        setJustUploaded(false);

        const dnaData = (await getDnaData(sampleData.dnaId))[0] as DNA | null;
        if (!dnaData) throw new Error(`DNA-Daten für ${sampleData.dnaId} nicht gefunden.`);
        setDna(dnaData);

        if (dnaData?.CP) {
            const cp = await getControlPlan(dnaData.CP);
            setControlPlan(cp);
        }

        const allSamples = await getSamplesForDna(sampleData.dnaId);
        const historical = allSamples.filter(s => s.timestamp !== sampleData.timestamp).slice(-20);
        setHistoricalSamples(historical);

        const initialImageUrl = sampleData.imageUrl || '';
        const initialNote = sampleData.note || '';
        setImageUrl(initialImageUrl);
        setNote(initialNote);
        setOriginalData({ imageUrl: initialImageUrl, note: initialNote });

        if (allSamples.length > 0 && allSamples[allSamples.length - 1].timestamp === sampleData.timestamp) {
            setUpdateDna(true);
        } else {
             setUpdateDna(false);
        }

        setHasImageError(false);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sampleId]);

  const handleSendToAi = async () => {
    if (!sample || !dna || !htmlSkeleton) {
        toast({ title: 'Error', description: 'HTML-Grundgerüst muss zuerst generiert werden.', variant: 'destructive' });
        return;
    }

    setIsGeneratingAnalysis(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalysisDialogOpen(true);

    try {
        const ps = controlPlan?.processSteps.find(p => p.processNumber === dna.OP);
        const char = ps?.characteristics.find(c => c.itemNumber === dna.Char);

        const result = await suggestResponsePlan({
            processStep: ps?.processName || dna.OP,
            characteristic: char?.DesciptionSpec || dna.Char,
            specificationLimits: `LSL: ${dna.LSL ?? 'N/A'}, USL: ${dna.USL ?? 'N/A'}, LCL: ${dna.LCL ?? 'N/A'}, UCL: ${dna.UCL ?? 'N/A'}, sUCL: ${dna.sUSL ?? 'N/A'}`,
            currentValue: `Individual Values: [${sample.values?.join(', ') ?? ''}], Mean: ${sample.mean?.toFixed(4) ?? 'N/A'}, Standard Deviation: ${sample.stddev?.toFixed(4) ?? 'N/A'}`,
            responsiblePersonRoles: ['Quality Engineer', 'Process Engineer', 'Operator'],
        });
        setAnalysisResult(result.suggestedResponsePlan);
    } catch (e: any) {
        setAnalysisError(e.message || "Ein unbekannter Fehler ist aufgetreten.");
        toast({ title: "AI-Analyse fehlgeschlagen", description: e.message, variant: 'destructive' });
    } finally {
        setIsGeneratingAnalysis(false);
    }
  };


  const handleSaveWithCallback = async (callback?: () => void) => {
    if (!sample || !sampleId) return;

    setIsSaving(true);
    try {
        const updatedSample: SampleData = { ...sample, imageUrl, note };
        await saveSampleData(updatedSample, sampleId, updateDna);
        
        // Update the original data to reset dirty state
        setOriginalData({ imageUrl, note });
        
        toast({
            title: "Gespeichert!",
            description: "Ihre Änderungen wurden übernommen.",
            duration: 2000,
        });

        // Execute callback if provided
        if (callback) {
            callback();
        }
    } catch (e: any) {
        toast({
            title: "Fehler beim Speichern",
            description: e.message,
            variant: 'destructive'
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleSaveAndExit = () => {
      handleSaveWithCallback(() => {
          router.back();
      });
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleUpload = (file: File) => {
    if (!sample) return;
    if (!file.type.startsWith('image/')) {
        setUploadError("Ungültiger Dateityp. Bitte nur Bilder hochladen.");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Die Datei ist größer als 10 MB. Bitte wählen Sie eine kleinere Datei.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setJustUploaded(false);

    const storage = getAppStorage();
    if (!storage) {
        setUploadError("Storage-Dienst ist nicht initialisiert.");
        setIsUploading(false);
        return;
    }

    const storageRef = ref(storage, `uploads/samples/${sample.dnaId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (uploadErr) => {
        console.error('Upload Error:', uploadErr);
        setUploadError(uploadErr.message);
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUrl(downloadURL);
          setJustUploaded(true);
        } catch (e: any) {
           setUploadError('Fehler beim Abrufen der Download-URL nach dem Upload.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
      }
    );
  };

  const handleCopyUrl = () => {
      if (!imageUrl) {
          toast({ variant: "destructive", title: "Keine URL zum Kopieren"});
          return;
      }
      navigator.clipboard.writeText(imageUrl);
      toast({ title: 'URL kopiert!', description: 'Die Bild-URL wurde in die Zwischenablage kopiert.' });
  }

  const handleClearUrl = () => {
      setImageUrl('');
  }

  const handleBack = () => {
    if (isDirty) {
      setIsBackAlertOpen(true);
    } else {
      router.back();
    }
  }

    const generateBarChartSVG = (
        allSamples: SampleData[],
        currentSampleTimestamp: string
    ): string => {
        const width = 800;
        const height = 400;
        const margin = { top: 20, right: 60, bottom: 30, left: 50 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        const maxSampleSize = Math.max(...allSamples.map(s => s.sampleSize || 0), 0);

        const xScale = (index: number) => margin.left + index * (plotWidth / allSamples.length);
        const yScale = (value: number) => margin.top + plotHeight * (1 - value / (maxSampleSize || 1));
        const barWidth = (plotWidth / allSamples.length) * 0.8;

        const bars = allSamples.map((s, i) => {
            const defects = s.defects || 0;
            const goodParts = (s.sampleSize || 0) - defects;

            const goodY = yScale(goodParts);
            const goodHeight = yScale(0) - goodY;
            const defectY = yScale(goodParts + defects);
            const defectHeight = goodY - defectY;

            const isCurrentSample = s.timestamp === currentSampleTimestamp;
            const stroke = isCurrentSample ? 'stroke="#005f9c" stroke-width="3"' : '';

            return `
                <g class="bar-group" transform="translate(${xScale(i)}, 0)" ${stroke}>
                    <rect y="${goodY}" width="${barWidth}" height="${goodHeight}" fill="#8884d8" />
                    <rect y="${defectY}" width="${barWidth}" height="${defectHeight}" fill="#d9534f" />
                </g>
            `;
        }).join('');
        
         const xTicks = allSamples.map((s, i) => {
            const xPos = xScale(i) + barWidth / 2;
            const date = new Date(s.timestamp);
            const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return `<text x="${xPos}" y="${height - margin.bottom + 15}" text-anchor="middle" class="x-tick-label">${time}</text>`;
        }).join('');


        return `
            <svg width="${width}" height="${height}" class="chart-container">
                <g class="grid">
                    ${Array.from({ length: 5 }).map((_, i) => `<line x1="${margin.left}" y1="${margin.top + i * plotHeight/4}" x2="${width-margin.right}" y2="${margin.top + i * plotHeight/4}" />`).join('')}
                </g>
                <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" />
                <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" />
                ${bars}
                ${xTicks}
            </svg>
        `;
    };
  
  const generateChartSVG = (
    chartType: 'mean' | 'stddev',
    allSamples: SampleData[],
    dnaData: DNA,
    currentSampleTimestamp: string
  ): string => {
    const width = 800;
    const height = chartType === 'mean' ? 400 : 250;
    const margin = { top: 20, right: 60, bottom: 30, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
  
    const dataKey = chartType === 'mean' ? 'mean' : 'stddev';
    const data = allSamples.map(s => s[dataKey]).filter(v => v !== undefined) as number[];
  
    let yDomainMin = chartType === 'mean' ? Infinity : 0;
    let yDomainMax = chartType === 'mean' ? -Infinity : 0;
  
    const relevantLimits = chartType === 'mean' ? [dnaData.LSL, dnaData.USL, dnaData.LCL, dnaData.UCL, dnaData.CL] : [dnaData.sUSL];
    const allValues = [...data, ...relevantLimits.filter(v => v !== undefined && v !== null) as number[]];
  
    if (allValues.length > 0) {
      yDomainMin = Math.min(...allValues.filter(v => typeof v === 'number' && isFinite(v)));
      yDomainMax = Math.max(...allValues.filter(v => typeof v === 'number' && isFinite(v)));
    }
  
    const yPadding = (yDomainMax - yDomainMin) * 0.1 || 1;
    const finalYMin = chartType === 'mean' ? yDomainMin - yPadding : 0;
    const finalYMax = yDomainMax + yPadding;
  
    const xScale = (index: number) => margin.left + (index / (data.length - 1 || 1)) * plotWidth;
    const yScale = (value: number) => margin.top + plotHeight * (1 - (value - finalYMin) / (finalYMax - finalYMin || 1));
  
    const linePoints = allSamples
        .map((s, i) => (s[dataKey] !== undefined ? `${xScale(i)},${yScale(s[dataKey]!)}` : ''))
        .filter(Boolean)
        .join(' ');

    const renderLine = (y: number | undefined | null, label: string, className: string) => {
      if (y === undefined || y === null) return '';
      const yPos = yScale(y);
      return `<g class="${className}">
        <line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" />
        <text x="${width - margin.right + 5}" y="${yPos}" dy=".3em" class="label">${label}</text>
      </g>`;
    };
    
    const renderPoints = () => {
        return allSamples.map((s, i) => {
            const val = s[dataKey];
            if (val === undefined) return '';

            let fill = '#005f9c'; // default blue
            const { exception } = s;

            if (exception) {
              fill = '#f0ad4e'; // orange
            } else {
              if (chartType === 'mean' && s.mean !== undefined) {
                 if ((dna.USL !== undefined && dna.USL !== null && s.mean > dna.USL) || (dna.LSL !== undefined && dna.LSL !== null && s.mean < dna.LSL)) {
                    fill = '#d9534f'; // red
                 } else if ((dna.UCL !== undefined && dna.UCL !== null && s.mean > dna.UCL) || (dna.LCL !== undefined && dna.LCL !== null && s.mean < dna.LCL)) {
                    fill = '#f0ad4e'; // orange
                 }
              } else if (chartType === 'stddev' && s.stddev !== undefined) {
                 if(dna.sUSL !== undefined && dna.sUSL !== null && s.stddev > dna.sUSL) {
                    fill = '#f0ad4e'; // orange
                 }
              }
            }
            
            const isCurrentSample = s.timestamp === currentSampleTimestamp;
            
            let pointCircle = `<circle class="point" cx="${xScale(i)}" cy="${yScale(val)}" r="4" fill="${fill}" />`;
            
            if (isCurrentSample) {
                 pointCircle = `<circle class="current-point" cx="${xScale(i)}" cy="${yScale(val)}" r="8" fill="none" stroke="${fill}" stroke-width="2" />`;
            }

            return pointCircle;

        }).join('');
    };
  
    return `
      <svg width="${width}" height="${height}" class="chart-container">
        <defs>
            <style>
                @keyframes blink { 
                    0% { stroke-opacity: 1; }
                    50% { stroke-opacity: 0.2; }
                    100% { stroke-opacity: 1; }
                }
                .current-point { animation: blink 1.5s infinite; }
            </style>
        </defs>
        <g class="grid">
          ${Array.from({ length: 5 }).map((_, i) => `<line x1="${margin.left}" y1="${margin.top + i * plotHeight/4}" x2="${width-margin.right}" y2="${margin.top + i * plotHeight/4}" />`).join('')}
        </g>
        <line class="axis-line" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" />
        <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" />
        
        ${chartType === 'mean' ? renderLine(dnaData.USL, 'USL', 'spec-line') : ''}
        ${chartType === 'mean' ? renderLine(dnaData.UCL, 'UCL', 'control-line') : ''}
        ${chartType === 'mean' ? renderLine(dnaData.CL, 'CL', 'center-line') : ''}
        ${chartType === 'mean' ? renderLine(dnaData.LCL, 'LCL', 'control-line') : ''}
        ${chartType === 'mean' ? renderLine(dnaData.LSL, 'LSL', 'spec-line') : ''}
        ${chartType === 'stddev' ? renderLine(dnaData.sUSL, 'sUCL', 'control-line') : ''}

        <polyline class="line" points="${linePoints}" />
        ${renderPoints()}
      </svg>
    `;
  };

 const handleGenerateHtmlSkeleton = async (andThen?: (html: string) => void) => {
    if (!sample || !dna) return;

    if (isDirty) {
        await handleSaveWithCallback(() => {
            const html = generateHtmlWithCurrentData();
            if (html && andThen) andThen(html);
        });
    } else {
        const html = generateHtmlWithCurrentData();
        if (html && andThen) andThen(html);
    }
};

const generateHtmlWithCurrentData = (): string | null => {
    if (!sample || !dna) return null;
    const allSamples = [...historicalSamples, { ...sample, imageUrl, note }].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let chartSection = '';
    let historicalDataString = '';
    let currentSampleRow = '';

    if (dna.charType === 'A') {
        const barChartSVG = generateBarChartSVG(allSamples, sample.timestamp);
        chartSection = `
            <h2>Balkendiagramm (Fehlerhafte Teile)</h2>
            ${barChartSVG}
        `;
        historicalDataString = allSamples.map(s => `
            <tr>
                <td>${new Date(s.timestamp).toLocaleString()}</td>
                <td>${s.defects ?? 'N/A'}</td>
                <td>${(s.sampleSize ?? 0) - (s.defects ?? 0)}</td>
                <td>${s.sampleSize ?? 'N/A'}</td>
                <td>${s.note || ''}</td>
                <td>${s.exception ? 'Ja' : 'Nein'}</td>
            </tr>
        `).join('');

        currentSampleRow = `
            ${sample.defects !== undefined ? `<tr><th>Defects</th><td>${sample.defects}</td></tr>` : ''}
            ${sample.sampleSize !== undefined ? `<tr><th>Sample Size</th><td>${sample.sampleSize}</td></tr>` : ''}
        `;
    } else {
        const xBarChartSVG = generateChartSVG('mean', allSamples, dna, sample.timestamp);
        const sChartSVG = generateChartSVG('stddev', allSamples, dna, sample.timestamp);
        chartSection = `
            <h2>Regelkarten</h2>
            <h3>x̄-Chart</h3>
            ${xBarChartSVG}
            <h3>s-Chart</h3>
            ${sChartSVG}
        `;
        historicalDataString = allSamples.map(s => `
            <tr>
                <td>${new Date(s.timestamp).toLocaleString()}</td>
                <td>${s.mean?.toFixed(4) ?? 'N/A'}</td>
                <td>${s.stddev?.toFixed(4) ?? 'N/A'}</td>
                <td>${s.values?.join(', ') ?? ''}</td>
                <td>${s.note || ''}</td>
                <td>${s.exception ? 'Ja' : 'Nein'}</td>
            </tr>
        `).join('');

        currentSampleRow = `
            ${sample.mean !== undefined ? `<tr><th>Mittelwert</th><td>${sample.mean.toFixed(4)}</td></tr>` : ''}
            ${sample.stddev !== undefined ? `<tr><th>StdAbw</th><td>${sample.stddev.toFixed(4)}</td></tr>` : ''}
            ${sample.values && sample.values.length > 0 ? `<tr><th>Werte</th><td>${sample.values.join(', ')}</td></tr>` : ''}
        `;
    }
    
    const currentSampleWithLatestChanges = { ...sample, imageUrl, note };

    const skeleton = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Qualitätskontroll-Analysebericht</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333; }
        .print-button-container { text-align: center; margin-bottom: 20px; }
        .print-button { background-color: #005f9c; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; transition: background-color: 0.3s; }
        .print-button:hover { background-color: #004c7d; }
        .container { max-width: 900px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; border-bottom: 2px solid #005f9c; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #005f9c; margin: 0; font-size: 2.5em; }
        .header p { color: #555; font-size: 0.9em; margin-top: 10px; }
        .section { margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 6px; border: 1px solid #ddd; }
        .section h2 { margin-top: 0; color: #444; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .data-table th, .data-table td { border: 1px solid #ccc; padding: 12px; text-align: left; vertical-align: top; }
        .data-table th { background-color: #eef; font-weight: bold; color: #004085; }
        .image-note-section { display: flex; gap: 20px; align-items-flex-start; }
        .image-container { flex-shrink: 0; width: 40%; text-align: center; }
        .note-container { flex-grow: 1; }
        .sample-image { max-width: 100%; height: auto; display: block; border-radius: 6px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); }
        .chart-container { width: 100%; height: auto; border: 1px solid #ccc; background-color: #fcfcfc; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        .chart-container .grid line { stroke: #e0e0e0; stroke-width: 1; }
        .chart-container .axis-line { stroke: #333; stroke-width: 2; }
        .chart-container .line { fill: none; stroke: #005f9c; stroke-width: 2; }
        .chart-container .point { stroke: #fff; stroke-width: 1.5; }
        .chart-container .current-point { r: 8; stroke-width: 2; fill: none; animation: blink 1.5s infinite; }
        @keyframes blink { 50% { stroke-opacity: 0.2; } }
        .chart-container .spec-line line { stroke: #d9534f; stroke-width: 2; stroke-dasharray: 4; }
        .chart-container .control-line line { stroke: #f0ad4e; stroke-width: 2; stroke-dasharray: 4; }
        .chart-container .center-line line { stroke: #5cb85c; stroke-width: 2; }
        .chart-container .label { font-size: 14px; font-weight: bold; fill: #555; }
        @media print { 
            body { background-color: #fff; } 
            .container { box-shadow: none; border-radius: 0; padding: 0; border: none; max-width: 100%;}
            .print-button-container { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="print-button-container"><button class="print-button" onclick="window.print()">Bericht drucken</button></div>
        <div class="header"><h1>Qualitätskontroll-Analysebericht</h1><p>Prozessschritt: ${dna.OP} / Merkmal: ${dna.Char}</p></div>
        
        <div class="section">
            <h2>Aktuelle Stichprobe</h2>
            <div class="image-note-section">
                 <div class="image-container">
                    ${currentSampleWithLatestChanges.imageUrl ? `<img src="${generateThumbnailUrl(currentSampleWithLatestChanges.imageUrl)}" alt="Stichprobenbild" class="sample-image" style="width: 300px;"/>` : ''}
                 </div>
                 <div class="note-container">
                    <table class="data-table">
                        <tbody>
                            <tr><th>Zeitstempel</th><td>${new Date(currentSampleWithLatestChanges.timestamp).toLocaleString()}</td></tr>
                            ${currentSampleRow}
                            <tr><th>Ausnahme</th><td>${currentSampleWithLatestChanges.exception ? 'Ja' : 'Nein'}</td></tr>
                            <tr><th>Notiz</th><td>${currentSampleWithLatestChanges.note || ''}</td></tr>
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>

        <div class="section">
            <h2>Historische Stichproben (letzte 20)</h2>
            <table class="data-table">
                 <thead>
                    <tr>
                        <th>Zeitstempel</th>
                        ${dna.charType === 'A' ? '<th>Defects</th><th>i.O.-Parts</th><th>Size</th>' : '<th>Mittelwert</th><th>StdAbw</th><th>Werte</th>'}
                        <th>Notiz</th>
                        <th>Ausnahme</th>
                    </tr>
                </thead>
                <tbody>${historicalDataString}</tbody>
            </table>
        </div>

        <div class="section">
            ${chartSection}
        </div>

        <div class="section">
            <h2>KI-Analyse</h2>
            <!-- PLATZHALTER FÜR KI-ANALYSE -->
        </div>
    </div>
</body>
</html>`;
    setHtmlSkeleton(skeleton);
    return skeleton;
};

const handleExportSkeleton = () => {
    handleGenerateHtmlSkeleton((html) => {
        if (!html || !sample) return;
        const blob = new Blob([html], { type: `text/html;charset=utf-8;` });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${sample.dnaId}_report.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export erfolgreich", description: "HTML-Grundgerüst wurde heruntergeladen." });
    });
};


  const handleCombinedExport = () => {
    if (!htmlSkeleton || !analysisResult || !sample) {
        toast({ title: "Fehler beim Export", description: "Es sind nicht alle Daten für den kombinierten Export vorhanden.", variant: 'destructive' });
        return;
    }
    
    const finalHtml = htmlSkeleton.replace(
        '<!-- PLATZHALTER FÜR KI-ANALYSE -->',
        analysisResult
    );
    const blob = new Blob([finalHtml], { type: `text/html;charset=utf-8;` });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${sample.dnaId}_full_report.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCardBackgroundColor = (): string => {
    if (isNewSample) return "bg-card";
    if (!sample || !dna) return "bg-card";

    // For attribute charts, the rule is simpler
    if (dna.charType === 'A') {
        return sample.defects !== undefined && sample.defects > 0 ? "bg-destructive/10" : "bg-blue-500/5";
    }

    // For variable charts
    if (sample.mean === undefined || sample.stddev === undefined) return "bg-blue-500/5";
    
    const { mean, stddev } = sample;
    const { LSL, USL, LCL, UCL, sUSL } = dna;

    if ((USL !== undefined && USL !== null && mean > USL) || (LSL !== undefined && LSL !== null && mean < LSL)) {
      return "bg-destructive/10";
    }
    if ((UCL !== undefined && UCL !== null && mean > UCL) || (LCL !== undefined && LCL !== null && mean < LCL) || (sUSL !== undefined && sUSL !== null && stddev > sUSL)) {
      return "bg-amber-400/10";
    }

    return "bg-blue-500/5"; // For in-control points
  }

  const isInvalidSrc = !imageUrl || hasImageError || !imageUrl.startsWith('http');
  const displayUrl = justUploaded ? imageUrl : generateThumbnailUrl(imageUrl);


  return (
      <>
       <ImageModal
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={imageUrl}
        imageAlt={`Vollbildansicht für Stichprobe`}
      />
       <AnalysisResultDialog
        isOpen={isAnalysisDialogOpen}
        onOpenChange={setIsAnalysisDialogOpen}
        isLoading={isGeneratingAnalysis}
        analysisResult={analysisResult}
        htmlSkeleton={htmlSkeleton}
        error={analysisError}
        dnaData={dna}
        sample={sample}
        historicalSamples={historicalSamples}
        onCombinedExport={handleCombinedExport}
       />
      <AlertDialog open={isBackAlertOpen} onOpenChange={setIsBackAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
                  <AlertDialogDescription>
                      Sie haben ungespeicherte Änderungen. Möchten Sie diese verwerfen und zurückgehen?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => router.back()}>Verwerfen &amp; Zurück</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto p-4 md:p-8">
          {isLoading ? (
            <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
          ) : error ? (
            <div className="text-center py-10 text-red-600 bg-red-50 rounded-md max-w-2xl mx-auto m-4">
                <AlertTriangle className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-lg font-medium">Fehler beim Laden der Daten</h3>
                <p className="mt-1 text-sm">{error}</p>
                 <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="mt-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                </Button>
            </div>
          ) : sample ? (
            <div className="space-y-4">
                <Card className={cn("max-w-2xl mx-auto transition-colors", getCardBackgroundColor())}>
                    <CardHeader>
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle className="text-lg">Bild &amp; Notiz</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                            <Button onClick={handleSaveAndExit} size="sm" disabled={isSaving || isUploading || !isDirty}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                            </Button>
                            </div>
                        </div>
                        <CardDescription className="pt-2 pl-12">
                            ID: <span className="font-mono text-xs bg-muted p-1 rounded">{sampleId}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anmerkungen zur Stichprobe..." disabled={isSaving || isUploading} rows={6} className="w-full"/>

                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="w-full"
                            disabled={isUploading || isSaving}
                        >
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isUploading ? `Lädt hoch... ${Math.round(uploadProgress)}%` : 'Neues Bild hochladen'}
                        </Button>
                        <Input
                            id="file-upload"
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                            accept="image/jpeg,image/png,image/gif"
                            className="hidden"
                            disabled={isUploading || isSaving}
                        />
                        {isUploading && <Progress value={uploadProgress} className="w-full" />}
                        {uploadError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Upload Fehler</AlertTitle>
                                <AlertDescription>{uploadError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="w-full flex flex-col items-center justify-center relative gap-2">
                            {isInvalidSrc ? (
                                <div className="w-64 h-64 flex items-center justify-center flex-shrink-0 bg-muted rounded-md">
                                    <Image
                                        src="https://placehold.co/600x400.png"
                                        alt="Error or no image placeholder"
                                        width={256}
                                        height={256}
                                        className="rounded-md object-contain aspect-square"
                                        data-ai-hint="placeholder"
                                    />
                                </div>
                            ) : (
                                <button onClick={() => setIsImageModalOpen(true)} className="block w-64 h-64 flex-shrink-0 cursor-pointer focus:outline-none group">
                                    <div className="w-64 h-64 relative mx-auto">
                                        <Image
                                            src={displayUrl}
                                            alt={`Foto für Stichprobe`}
                                            width={256}
                                            height={256}
                                            className="rounded-md object-contain aspect-square group-hover:opacity-80 transition-opacity"
                                            data-ai-hint="sample image"
                                            onError={() => {
                                                if (!hasImageError) setHasImageError(true);
                                            }}
                                        />
                                    </div>
                                </button>
                            )}
                        </div>
                        {hasImageError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Fehler beim Laden des Bildes</AlertTitle>
                                <AlertDescription>Die angegebene URL ist ungültig.</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." disabled={isSaving || isUploading} className="text-xs text-muted-foreground flex-grow" />
                                <Button onClick={handleCopyUrl} variant="outline" size="icon" disabled={isSaving || isUploading || !imageUrl} aria-label="URL kopieren">
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button onClick={handleClearUrl} variant="outline" size="icon" disabled={isSaving || isUploading || !imageUrl} aria-label="URL löschen">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="items-top flex space-x-2 pt-2">
                            <Checkbox id="update-dna" checked={updateDna} onCheckedChange={(checked) => setUpdateDna(Boolean(checked))} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="update-dna">
                                DNA-Datensatz aktualisieren
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                Aktualisiert den Zeitstempel und Status im Haupt-DNA-Datensatz.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                            {sample.mean !== undefined && <p>Mittelwert: {sample.mean.toFixed(4)}</p>}
                            {sample.stddev !== undefined && <p>StdAbw: {sample.stddev.toFixed(4)}</p>}
                            {sample.values && sample.values.length > 0 && (
                                <p>Werte: {sample.values.join('; ')}</p>
                            )}
                            {sample.defects !== undefined && (
                                <p>Fehlerhafte Teile: {sample.defects}</p>
                            )}
                        </div>
                    </CardFooter>
                </Card>
                <Card className="max-w-2xl mx-auto w-full">
                    <CardHeader>
                        <CardTitle>AI-Assistent & Export</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleExportSkeleton}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Grundgerüst als HTML exportieren
                            </Button>
                            <Button onClick={handleSendToAi} disabled={isGeneratingAnalysis || !htmlSkeleton} variant="secondary">
                                {isGeneratingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Analyse an AI senden
                            </Button>
                        </div>
                         <div className="space-y-2 mt-4">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="html-skeleton">HTML-Grundgerüst (Vorschau)</Label>
                                <Button size="sm" variant="outline" onClick={() => handleGenerateHtmlSkeleton()}>Grundgerüst jetzt generieren</Button>
                            </div>
                            <Textarea id="html-skeleton" value={htmlSkeleton ?? ''} readOnly placeholder="Klicken Sie auf 'Grundgerüst generieren', um das HTML zu erstellen und eine Vorschau anzuzeigen." rows={10} className="font-mono text-xs"/>
                        </div>
                    </CardContent>
                </Card>
            </div>
          ) : (
             <div className="text-center py-10 text-gray-500">
                <p>Keine Stichprobendaten gefunden.</p>
            </div>
          )}
      </div>
      </>
  );
}
