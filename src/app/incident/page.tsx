

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getWorkstations, addIncident, getAppStorage } from '@/lib/data';
import type { Workstation } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft, LibraryBig, ImageIcon, UploadCloud, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { KeepKnowLogo } from '@/components/icons';
import Image from 'next/image';
import { generateThumbnailUrl } from '@/lib/image-utils';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const incidentSchema = z.object({
  workplace: z.string().min(1, { message: 'Workplace is required.' }),
  title: z.string().min(1, { message: 'Incident title is required.' }),
  reportedAt: z.date({ required_error: 'A date and time of reporting is required.' }),
  priority: z.enum(['Niedrig', 'Mittel', 'Hoch', 'Kritisch']),
  type: z.enum(['Bug', 'Performance', 'Ausfall', 'Sonstiges']),
  description: z.string().min(1, { message: 'Description is required.' }),
  team: z.enum(['Backend-Team', 'Frontend-Team', 'DevOps', 'QA', 'Sonstiges']),
  components: z.string().optional(),
  attachmentUrl: z.string().url({ message: "Bitte geben Sie eine gültige URL ein." }).optional().or(z.literal('')),
  affectedUser: z.string().optional(),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

function IncidentPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [loadingWorkstations, setLoadingWorkstations] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  
  const preselectedWorkplace = searchParams.get('ap');
  const preselectedTitle = searchParams.get('po');


  React.useEffect(() => {
    async function loadWorkstations() {
      try {
        const wsData = await getWorkstations();
        setWorkstations(wsData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error loading workstations',
          description: 'Could not fetch the list of workstations.',
        });
      } finally {
        setLoadingWorkstations(false);
      }
    }
    loadWorkstations();
  }, [toast]);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      workplace: preselectedWorkplace || '',
      title: preselectedTitle || '',
      reportedAt: new Date(),
      priority: 'Mittel',
      type: 'Bug',
      description: '',
      team: 'Frontend-Team',
      components: '',
      affectedUser: '',
      attachmentUrl: '',
    },
  });
  
  const attachmentUrl = form.watch('attachmentUrl');

  const handleUpload = (file: File) => {
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

    const storageRef = ref(storage, `uploads/incidents/${Date.now()}_${file.name}`);
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
          form.setValue('attachmentUrl', downloadURL, { shouldValidate: true, shouldDirty: true });
          toast({
            title: 'Upload erfolgreich',
            description: 'Die Datei wurde hochgeladen und die URL wurde dem Formular hinzugefügt.',
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


  const onSubmit = async (data: IncidentFormValues) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not authenticated",
            description: "You must be logged in to submit an incident."
        });
        return;
    }

    try {
        const incidentData = {
            ...data,
            components: data.components?.split(',').map(c => c.trim()).filter(c => c) || [],
        };
        
        await addIncident(incidentData);
        
        toast({
            title: "Incident Reported",
            description: "Thank you for your submission. The team has been notified."
        });
        router.push('/lenkungsplan');
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: e.message || "An unknown error occurred."
        })
    }
  };

  if (authLoading || loadingWorkstations) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="flex min-h-screen flex-col bg-background">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
              <KeepKnowLogo className="h-8 w-8 text-primary" />
              <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
                Incident Erfassung
              </h1>
            </div>
             <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                {(form.formState.isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Senden
              </Button>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Neuen Incident melden</CardTitle>
                <CardDescription>
                  Füllen Sie das Formular aus, um ein Problem oder einen Fehler zu melden.
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="workplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbeitsplatz*</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!preselectedWorkplace}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wählen Sie einen Arbeitsplatz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {workstations.map((ws) => (
                                <SelectItem key={ws.AP} value={ws.AP}>
                                  {ws.AP} - {ws.Beschreibung}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incident-Titel*</FormLabel>
                          <FormControl>
                            <Input placeholder="Kurze Zusammenfassung des Problems" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportedAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Erfassungsdatum*</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-[240px] pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP HH:mm')
                                  ) : (
                                    <span>Datum auswählen</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priorität*</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Priorität auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Niedrig">Niedrig</SelectItem>
                                <SelectItem value="Mittel">Mittel</SelectItem>
                                <SelectItem value="Hoch">Hoch</SelectItem>
                                <SelectItem value="Kritisch">Kritisch</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Incident-Typ*</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Typ auswählen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Bug">Bug</SelectItem>
                                <SelectItem value="Performance">Performance</SelectItem>
                                <SelectItem value="Ausfall">Ausfall</SelectItem>
                                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beschreibung*</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Beschreiben Sie den Vorfall detailliert. Schritte zur Reproduktion, erwartetes vs. tatsächliches Verhalten, etc."
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="team"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zuständiges Team</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Team auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Backend-Team">Backend-Team</SelectItem>
                              <SelectItem value="Frontend-Team">Frontend-Team</SelectItem>
                              <SelectItem value="DevOps">DevOps</SelectItem>
                              <SelectItem value="QA">QA</SelectItem>
                              <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="components"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Betroffene Komponenten/Services</FormLabel>
                          <FormControl>
                            <Input placeholder="z.B. API, Datenbank (kommagetrennt)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="affectedUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Betroffener Benutzer (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="E-Mail oder Name des Benutzers" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     
                    <div className="space-y-2">
                      <FormLabel>Anhang</FormLabel>
                       <Input
                            id="file-upload"
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                            accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.xlsx,.pptx,.txt"
                            className="hidden"
                            disabled={isUploading}
                        />
                         <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isUploading ? `Lädt hoch... ${Math.round(uploadProgress)}%` : 'Datei hochladen'}
                        </Button>
                         {isUploading && <Progress value={uploadProgress} className="w-full mt-2" />}
                        {uploadError && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTitle>Upload Fehler</AlertTitle>
                                <AlertDescription>{uploadError}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <FormField
                      control={form.control}
                      name="attachmentUrl"
                      render={({ field }) => (
                        <FormItem>
                           {attachmentUrl && (
                            <div className="mt-2 space-y-2">
                                 <div className="flex items-center gap-2">
                                    <div className="flex-grow">
                                        <FormControl>
                                          <Input placeholder="https://..." {...field} readOnly className="bg-muted"/>
                                        </FormControl>
                                        <FormDescription>
                                          Dies ist die URL der hochgeladenen Datei.
                                        </FormDescription>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => form.setValue('attachmentUrl', '')}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                 </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
              </CardContent>
            </Card>
          </main>
        </form>
      </Form>
    </div>
    </>
  );
}

export default function IncidentPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <IncidentPageContent />
        </React.Suspense>
    );
}
