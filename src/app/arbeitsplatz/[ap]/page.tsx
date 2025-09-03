
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getWorkstation, saveWorkstation, getAppStorage, listStorageFiles } from '@/lib/data';
import type { Workstation, StorageFile } from '@/types';
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
import { StorageBrowser } from '@/components/cp/StorageBrowser';
import { ImageModal } from '@/components/cp/ImageModal';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { findThumbnailUrl } from '@/lib/image-utils';

export default function WorkstationDetailPage({ params }: { params: Promise<{ ap: string }> }) {
  const router = useRouter();
  const { ap } = React.use(params);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [workstation, setWorkstation] = React.useState<Workstation | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = React.useState('');
  const [storageFiles, setStorageFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState('');
  const [hasImageError, setHasImageError] = React.useState(false);

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  
  React.useEffect(() => {
    if (!ap) {
      setError('Kein Arbeitsplatz (AP) in der URL gefunden.');
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [wsData, files] = await Promise.all([
          getWorkstation(ap),
          listStorageFiles('uploads/')
        ]);
        if (!wsData) {
          throw new Error(`Arbeitsplatz mit AP ${ap} nicht gefunden.`);
        }
        setWorkstation(wsData);
        setStorageFiles(files);
        setImageUrl(wsData.imageUrl || '');
        setOriginalImageUrl(wsData.imageUrl || '');
        setHasImageError(false);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ap]);

  const handleSaveWithNewImageUrl = async (newImageUrl: string) => {
    if (!workstation) return;

    setIsSaving(true);
    try {
        const updatedWorkstation = { ...workstation, imageUrl: newImageUrl };
        await saveWorkstation(updatedWorkstation);
        setWorkstation(updatedWorkstation);
        setOriginalImageUrl(newImageUrl);
        setImageUrl(newImageUrl);
        toast({ title: 'Gespeichert!', description: 'Die Änderungen wurden erfolgreich übernommen.' });
        router.push('/arbeitsplaetze');
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
    if (!workstation) return;
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

    const storage = getAppStorage();
    if (!storage) {
        setUploadError("Storage-Dienst ist nicht initialisiert.");
        setIsUploading(false);
        return;
    }

    const storageRef = ref(storage, `uploads/arbeitsplaetze/${ap}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload Error:', error);
        setUploadError('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUrl(downloadURL);
          setHasImageError(false);
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
    setImageUrl('');
  }

  const handleCopyUrl = () => {
      if (!imageUrl) {
          toast({ variant: "destructive", title: "Keine URL zum Kopieren"});
          return;
      }
      navigator.clipboard.writeText(imageUrl);
      toast({ title: 'URL kopiert!', description: 'Die Bild-URL wurde in die Zwischenablage kopiert.' });
  }

  const handleImageSelectFromBrowser = async (url: string) => {
    setIsBrowserOpen(false);
    setImageUrl(url);
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

  const isInvalidSrc = !imageUrl || hasImageError || !imageUrl.startsWith('http');
  const isUrlChanged = imageUrl !== originalImageUrl;
  const thumbnailUrl = findThumbnailUrl(imageUrl, storageFiles);
  
  const handleBack = () => {
    router.push('/arbeitsplaetze');
  }

  return (
    <>
      <ImageModal 
        isOpen={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        imageUrl={imageUrl}
        imageAlt={`Vollbildansicht für Arbeitsplatz ${workstation?.AP}`}
      />
      <StorageBrowser 
        isOpen={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        onImageSelect={handleImageSelectFromBrowser}
      />
      <div className="p-4 md:p-8">
        <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu den Arbeitsplätzen
        </Button>

        {isLoading ? (
          <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
        ) : error ? (
          <div className="text-center py-10 text-red-600 bg-red-50 rounded-md max-w-2xl mx-auto">
              <AlertTriangle className="mx-auto h-12 w-12" />
              <h3 className="mt-2 text-lg font-medium">Fehler beim Laden der Daten</h3>
              <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : workstation ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Bild zum Arbeitsplatz</CardTitle>
              <CardDescription>
                Details für Arbeitsplatz <span className="font-mono">{workstation.AP}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                  <p><strong>Beschreibung:</strong> {workstation.Beschreibung || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                  <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                      disabled={isUploading || isSaving}
                      >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      {isUploading ? `Lädt hoch... ${Math.round(uploadProgress)}%` : 'Bild auswählen & hochladen'}
                  </Button>
                  <Input
                      id="file-upload"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/gif"
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
                          {isInvalidSrc ? (
                              <Image
                                  src="https://placehold.co/600x400.png"
                                  alt="Error or no image placeholder"
                                  width={600}
                                  height={400}
                                  className="rounded-md object-contain w-full aspect-video"
                                  data-ai-hint="placeholder"
                              />
                          ) : (
                              <button onClick={() => setIsImageModalOpen(true)} className="block w-full cursor-pointer focus:outline-none group">
                                  <Image
                                      src={thumbnailUrl}
                                      alt={`Foto für Arbeitsplatz ${workstation.AP}`}
                                      width={600}
                                      height={400}
                                      className="rounded-md object-contain w-full aspect-video group-hover:opacity-80 transition-opacity"
                                      data-ai-hint="workstation image"
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
                              <p className="mt-2 text-lg font-semibold text-primary">Bild hier ablegen</p>
                            </div>
                          )}
                          </div>
                      </CardContent>
                  </Card>
                  {hasImageError && (
                      <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Fehler beim Laden des Bildes</AlertTitle>
                          <AlertDescription>
                              Die angegebene URL konnte nicht geladen werden oder ist ungültig. Bitte laden Sie ein neues Bild hoch.
                          </AlertDescription>
                      </Alert>
                  )}
              </div>

              <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                      <AccordionTrigger>
                          <div className="flex items-center gap-2 text-sm font-medium">
                              <ChevronDown className="h-4 w-4 no-rotate" />
                              <span className="text-sm">Bildverwaltung</span>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                          <div className="space-y-2">
                              <Label htmlFor="imageUrl">Bild-URL (.jpg, .png, .gif)</Label>
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

                          <div className="space-y-2">
                              <Label>Oder aus Storage auswählen</Label>
                              <Button
                                  onClick={() => setIsBrowserOpen(true)}
                                  variant="outline"
                                  className="w-full"
                                  disabled={isUploading || isSaving}
                              >
                                  <LibraryBig className="mr-2 h-4 w-4" />
                                  Storage durchsuchen
                              </Button>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter>
                  <Button onClick={handleSave} className="w-full" disabled={isSaving || isUploading || !isUrlChanged}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Speichern...' : 'Speichern & Schliessen'}
                  </Button>
              </CardFooter>
          </Card>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>Keine Arbeitsplatzdaten gefunden.</p>
          </div>
        )}
      </div>
    </>
  );
}
