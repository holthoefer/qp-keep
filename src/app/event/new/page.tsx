
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, ArrowLeft, UploadCloud, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getEvent, addEvent, updateEvent, type Event, getAppStorage, getWorkstations, type Workstation } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';
import logo from '../../Logo.png';

export default function NewEventPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const eventId = searchParams.get('id');
  const [eventData, setEventData] = React.useState<Event | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(!!eventId);

  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  
  const [description, setDescription] = React.useState('');
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const [selectedWorkstation, setSelectedWorkstation] = React.useState<Workstation | null>(null);
  
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const preselectedWorkplace = searchParams.get('ap');
  
  const canEdit = React.useMemo(() => {
    if (!user) return false;
    if (roles.includes('admin')) return true;
    if (isEditMode && eventData) return eventData.userId === user.uid;
    if (!isEditMode) return true; // Anyone can create
    return false;
  }, [user, roles, isEditMode, eventData]);


  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    
    async function loadInitialData() {
      setLoadingData(true);
      try {
        const wsData = await getWorkstations();
        setWorkstations(wsData);

        if(eventId) {
            const fetchedEventData = await getEvent(eventId);
            if (fetchedEventData) {
                setEventData(fetchedEventData);
                setDescription(fetchedEventData.description);
                setAttachmentUrl(fetchedEventData.attachmentUrl || '');
                if (fetchedEventData.workplace) {
                    const preselected = wsData.find(ws => ws.AP === fetchedEventData.workplace);
                    setSelectedWorkstation(preselected || null);
                }
            } else {
                 toast({ title: 'Event nicht gefunden', variant: 'destructive' });
                 router.push('/events');
            }
        } else if (preselectedWorkplace) {
          const preselected = wsData.find(ws => ws.AP === preselectedWorkplace);
          if (preselected) {
            setSelectedWorkstation(preselected);
          }
        }
      } catch (err: any) {
        toast({ title: 'Fehler beim Laden der Arbeitsplätze', description: err.message, variant: 'destructive' });
      } finally {
        setLoadingData(false);
      }
    }
    
    loadInitialData();
  }, [user, authLoading, router, preselectedWorkplace, eventId, toast]);

  const handleSaveEvent = async () => {
    if (!user || !description.trim()) {
      toast({ title: 'Beschreibung darf nicht leer sein.', variant: 'destructive'});
      return;
    }
    if (!canEdit) {
      toast({ title: 'Keine Berechtigung', description: 'Sie haben keine Berechtigung, dieses Event zu speichern.', variant: 'destructive'});
      return;
    }

    try {
      if (isEditMode && eventId) {
        const eventUpdateData: Partial<Event> = {
            description,
            attachmentUrl,
            workplace: selectedWorkstation?.AP,
            po: selectedWorkstation?.POcurrent,
            op: selectedWorkstation?.OPcurrent,
            lot: selectedWorkstation?.LOTcurrent,
        };
        await updateEvent(eventId, eventUpdateData);
        toast({ title: 'Event erfolgreich aktualisiert' });

      } else {
        const newEventData: Omit<Event, 'id'> = {
            description,
            eventDate: Timestamp.now(),
            reporter: user.displayName || user.email || 'Unbekannt',
            userId: user.uid,
            ...(selectedWorkstation && { 
            workplace: selectedWorkstation.AP,
            po: selectedWorkstation.POcurrent,
            op: selectedWorkstation.OPcurrent,
            lot: selectedWorkstation.LOTcurrent,
            }),
            ...(attachmentUrl && { attachmentUrl: attachmentUrl }),
        };
        await addEvent(newEventData);
        toast({ title: 'Event erfolgreich erfasst' });
      }
      router.push('/events');
    } catch(e: any) {
      toast({ title: 'Fehler beim Speichern', description: e.message, variant: 'destructive' });
    }
  }

  const handleUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storage = getAppStorage();
    if (!storage) {
      setUploadError("Storage-Dienst ist nicht initialisiert.");
      setIsUploading(false);
      return;
    }
    const storageRef = ref(storage, `uploads/events/${Date.now()}_${file.name}`);
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
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setAttachmentUrl(downloadURL);
        setIsUploading(false);
        toast({ title: 'Upload erfolgreich', description: 'Die Datei wurde hochgeladen.' });
      }
    );
  };

  const handleWorkstationChange = (ap: string) => {
      if (ap === 'none') {
        setSelectedWorkstation(null);
      } else {
        const station = workstations.find(ws => ws.AP === ap) || null;
        setSelectedWorkstation(station);
      }
  }
  
  const isSaveDisabled = !description.trim() || isUploading || !canEdit;

  if (authLoading || loadingData) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
          </Button>
          <Image src={logo} alt="qp Loop Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            {isEditMode ? 'Event bearbeiten' : 'Neues Event'}
          </h1>
        </div>
        <Button onClick={handleSaveEvent} disabled={isSaveDisabled}>
            <Send className="mr-2 h-4 w-4" />
            Senden
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Event erfassen</CardTitle>
                <CardDescription>
                    Beschreiben Sie das Ereignis und ordnen Sie es bei Bedarf einem Arbeitsplatz zu.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="workstation">Arbeitsplatz (optional)</Label>
                    <Select 
                        value={selectedWorkstation?.AP || 'none'}
                        onValueChange={handleWorkstationChange}
                        disabled={!canEdit}
                    >
                        <SelectTrigger><SelectValue placeholder="Arbeitsplatz auswählen" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Kein Arbeitsplatz</SelectItem>
                            {workstations.map(ws => (
                                <SelectItem key={ws.AP} value={ws.AP}>{ws.AP} - {ws.Beschreibung}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedWorkstation && (
                <div className="text-sm text-muted-foreground space-y-1 rounded-md border p-3 bg-muted">
                    <p><strong>Auftrag:</strong> {selectedWorkstation.POcurrent || 'N/A'}</p>
                    <p><strong>Prozess:</strong> {selectedWorkstation.OPcurrent || 'N/A'}</p>
                    <p><strong>Charge:</strong> {selectedWorkstation.LOTcurrent || 'N/A'}</p>
                </div>
                )}
                <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea 
                        id="description" 
                        placeholder="z.B. Maschine M-05 verliert Öl am Hauptgetriebe."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        disabled={!canEdit}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="attachment">Anhang (optional)</Label>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            disabled={isUploading || !canEdit}
                            className="flex-shrink-0"
                        >
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isUploading ? `${Math.round(uploadProgress)}%` : 'Datei hochladen'}
                        </Button>
                        <Input
                            id="attachment"
                            value={attachmentUrl}
                            readOnly
                            placeholder="URL wird nach Upload angezeigt"
                            className="flex-grow bg-muted"
                        />
                    </div>
                    {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                    {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
                    <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.docx,.xlsx,.pptx"
                        disabled={!canEdit}
                    />
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
