
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuftrag, saveAuftrag, getAppStorage, listStorageFiles } from '@/lib/data';
import type { Auftrag, StorageFile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle, UploadCloud, Copy, Trash2, LibraryBig, ChevronDown, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { generateThumbnailUrl } from '@/lib/image-utils';


interface AuftragDetailPageProps {
  params: Promise<{ po: string }>;
  isModal?: boolean;
  onClose?: () => void;
}

export default function AuftragDetailPage({ params, isModal = false, onClose }: AuftragDetailPageProps) {
  const router = useRouter();
  const { po } = React.use(params);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [auftrag, setAuftrag] = React.useState<Auftrag | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState('');
  const [hasImageError, setHasImageError] = React.useState(false);

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [justUploaded, setJustUploaded] = React.useState(false);
  
  React.useEffect(() => {
    if (!po) {
      setError('Kein Auftrag (PO) in der URL gefunden.');
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const auftragData = await getAuftrag(po);
        if (!auftragData) {
          throw new Error(`Auftrag mit PO ${po} nicht gefunden.`);
        }
        setAuftrag(auftragData);
        setImageUrl(auftragData.imageUrl || '');
        setOriginalImageUrl(auftragData.imageUrl || '');
        setHasImageError(false);
        setJustUploaded(false);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [po]);

  const handleSaveWithNewImageUrl = async (newImageUrl: string) => {
    if (!auftrag) return;

    setIsSaving(true);
    try {
        const updatedAuftrag = { ...auftrag, imageUrl: newImageUrl };
        await saveAuftrag(updatedAuftrag);
        setAuftrag(updatedAuftrag);
        setOriginalImageUrl(newImageUrl);
        setImageUrl(newImageUrl);
        setJustUploaded(false);
        toast({ title: 'Gespeichert!', description: 'Die Änderungen wurden erfolgreich übernommen.' });
        if (isModal && onClose) {
          onClose();
        } else {
            router.push('/PO');
        }
    } catch(e: any) {
        toast({
            title: "Fehler beim Speichern",
            description: e.message,
            variant: 'destructive'
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleUpload = (file: File) => {
    if (!auftrag) return;

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

    const storageRef = ref(storage, `uploads/auftraege/${po}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload Error:', error);
        let errorMessage = 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.';
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage = "Berechtigungsfehler. Bitte überprüfen Sie die Storage-Regeln in Ihrer Firebase Console.";
            break;
          case 'storage/canceled':
            errorMessage = "Der Upload wurde abgebrochen.";
            break;
          case 'storage/retry-limit-exceeded':
            errorMessage = "Zeitüberschreitung bei der Verbindung. Überprüfen Sie Ihre Internetverbindung und die Firebase-Konfiguration (insbesondere storageBucket).";
            break;
        }
        setUploadError(errorMessage);
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUrl(downloadURL); // Set image url but don't save yet
          setHasImageError(false);
          setJustUploaded(true);
           toast({
            title: 'Upload erfolgreich',
            description: 'Klicken Sie auf Speichern, um die Änderung zu übernehmen.',
          });
        } catch (e: any) {
           setUploadError('Fehler beim Abrufen der Download-URL nach dem Upload.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
      }
    );
  };

  const handleSave = async () => {
    await handleSaveWithNewImageUrl(imageUrl);
  }

  const handleClearUrl = async () => {
    setImageUrl(''); // Clear locally, save will persist it
  }

  const handleCopyUrl = () => {
      if (!imageUrl) {
          toast({ variant: "destructive", title: "Keine URL zum Kopieren"});
          return;
      }
      navigator.clipboard.writeText(imageUrl);
      toast({ title: 'URL kopiert!', description: 'Die Bild-URL wurde in die Zwischenablage kopiert.' });
  }

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split('?')[0]);
  const isInvalidSrc = !imageUrl || hasImageError || !imageUrl.startsWith('http');
  const isUrlImage = imageUrl && isImage(imageUrl);
  const isUrlChanged = imageUrl !== originalImageUrl;
  const displayUrl = justUploaded ? imageUrl : generateThumbnailUrl(imageUrl);
  
  const handleBack = () => {
    if(onClose) {
      onClose();
    } else {
      router.push('/PO');
    }
  }

  return (
    <>
      <ImageModal 
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={imageUrl}
        imageAlt={`Vollbildansicht für Auftrag ${auftrag?.PO}`}
      />
      <div className={cn("h-full overflow-y-auto", isModal ? "p-0" : "p-4 md:p-8")}>
      {!isModal && (
        <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
        </Button>
      )}

      {isLoading ? (
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
      ) : error ? (
        <div className="text-center py-10 text-red-600 bg-red-50 rounded-md max-w-2xl mx-auto">
            <AlertTriangle className="mx-auto h-12 w-12" />
            <h3 className="mt-2 text-lg font-medium">Fehler beim Laden der Daten</h3>
            <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : auftrag ? (
        <Card className={cn("max-w-2xl mx-auto", isModal && "border-none shadow-none")}>
           <CardHeader className={cn(isModal && "pt-0")}>
            <CardTitle className="text-lg">Anhang zum Auftrag</CardTitle>
            <CardDescription>
              Details für Auftrag <span className="font-mono">{auftrag.PO}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <p><strong>Control Plan:</strong> {auftrag.CP || 'N/A'}</p>
                <p><strong>Anmerkung:</strong> {auftrag.Anmerkung || 'N/A'}</p>
            </div>
             <div className="space-y-2">
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                    disabled={isUploading || isSaving}
                    >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isUploading ? `Lädt hoch... ${Math.round(uploadProgress)}%` : 'Datei auswählen & hochladen'}
                </Button>
                <Input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    disabled={isUploading || isSaving}
                />
            </div>
             {isUploading && <Progress value={uploadProgress} className="w-full" />}
             {uploadError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Upload Fehler</AlertTitle>
                    <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
             )}
            <div className="space-y-4">
                <Card 
                  className={cn("transition-colors", isDragging && "border-primary ring-2 ring-primary")}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragEvents}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                    <CardContent className="p-4">
                       <div className={cn("aspect-video w-full bg-muted rounded-md flex items-center justify-center relative", isDragging && "pointer-events-none")}>
                        {isInvalidSrc || !isUrlImage ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              {isUrlImage ? (
                                <>
                                 <AlertTriangle className="h-10 w-10" />
                                 <span>Bild konnte nicht geladen werden</span>
                                </>
                              ) : imageUrl ? (
                                <>
                                  <AlertTriangle className="h-10 w-10" />
                                  <span>Keine Vorschau für diesen Dateityp</span>
                                  <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2">Datei öffnen</a>
                                </>
                              ) : (
                                <span>Kein Anhang vorhanden</span>
                              )}
                           </div>
                        ) : (
                            <button onClick={() => setIsImageModalOpen(true)} className="block w-full cursor-pointer focus:outline-none group">
                                 <Image
                                    src={displayUrl}
                                    alt={`Foto für Auftrag ${auftrag.PO}`}
                                    width={600}
                                    height={400}
                                    className="rounded-md object-contain w-full aspect-video group-hover:opacity-80 transition-opacity"
                                    data-ai-hint="order image"
                                    onError={() => {
                                        if (!hasImageError) {
                                          setHasImageError(true);
                                        }
                                    }}
                                />
                            </button>
                        )}
                         {isDragging && (
                          <div className="absolute inset-0 bg-primary/20 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-primary">
                            <UploadCloud className="h-12 w-12 text-primary" />
                            <p className="mt-2 text-lg font-semibold text-primary">Datei hier ablegen</p>
                          </div>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-2 pt-4">
                <Label htmlFor="imageUrl">Anhang-URL</Label>
                <div className="flex items-center gap-2">
                    <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="flex-grow" disabled={isSaving || isUploading}/>
                    <Button onClick={handleCopyUrl} variant="outline" size="icon" disabled={isSaving || isUploading || !imageUrl} aria-label="Copy URL">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleClearUrl} variant="outline" size="icon" disabled={isSaving || isUploading} aria-label="Clear URL">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

          </CardContent>
           <CardFooter className={cn(isModal && "pt-0")}>
                <Button onClick={handleSave} className="w-full" disabled={isSaving || isUploading || !isUrlChanged}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Speichern...' : 'Speichern & Schliessen'}
                </Button>
            </CardFooter>
        </Card>
      ) : (
         <div className="text-center py-10 text-gray-500">
            <p>Keine Auftragsdaten gefunden.</p>
        </div>
      )}
    </div>
    </>
  );
}
