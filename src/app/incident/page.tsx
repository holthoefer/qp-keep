

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
import { getWorkstation, addIncident, getIncident } from '@/lib/data';
import type { Workstation, Incident } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft, LibraryBig, ImageIcon, UploadCloud, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { KeepKnowLogo } from '@/components/icons';
import Image from 'next/image';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAppStorage } from '@/lib/data';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';


const incidentSchema = z.object({
  workplace: z.string().min(1, { message: 'Workplace is required.' }),
  title: z.string().min(1, { message: 'Incident title is required.' }),
  reportedAt: z.date({ required_error: 'A date and time of reporting is required.' }),
  priority: z.enum(['Niedrig', 'Mittel', 'Hoch', 'Kritisch']),
  type: z.enum(['Bug', 'Performance', 'Ausfall', 'Sonstiges']),
  description: z.string().min(1, { message: 'Description is required.' }),
  team: z.enum(['Backend-Team', 'DevOps', 'QA', 'Sonstiges']),
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
  
  const incidentId = searchParams.get('id');
  const preselectedWorkplace = searchParams.get('ap');
  const preselectedTitle = searchParams.get('po');
  
  const [workstation, setWorkstation] = React.useState<Workstation | null>(null);
  const [loadingData, setLoadingData] = React.useState(true);
  
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      workplace: '',
      title: '',
      reportedAt: new Date(),
      priority: 'Mittel',
      type: 'Bug',
      description: '',
      team: 'Sonstiges',
      components: '',
      affectedUser: '',
      attachmentUrl: '',
    },
  });

  React.useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      try {
        if (incidentId) {
          // Edit mode
          const incidentData = await getIncident(incidentId);
          if (incidentData) {
            form.reset({
                ...incidentData,
                reportedAt: incidentData.reportedAt.toDate(),
                components: incidentData.components?.join(', ') || '',
            });
            const wsData = await getWorkstation(incidentData.workplace);
            setWorkstation(wsData);
          } else {
             toast({ variant: 'destructive', title: 'Fehler', description: 'Incident nicht gefunden.' });
             router.push('/incidents');
          }
        } else if (preselectedWorkplace) {
          // New mode with pre-selection
          const wsData = await getWorkstation(preselectedWorkplace);
          setWorkstation(wsData);
          form.reset({
              ...form.getValues(),
              workplace: preselectedWorkplace,
              title: preselectedTitle || '',
          });
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error loading data',
          description: error.message,
        });
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, [incidentId, preselectedWorkplace, preselectedTitle, form, router, toast]);
  
  const handleUpload = (file: File) => {
    if (!incidentId && !preselectedWorkplace) {
        setUploadError("Bitte speichern Sie den Incident zuerst oder rufen Sie ihn über einen Arbeitsplatz auf.");
        return;
    }
    const incidentIdentifier = incidentId || preselectedWorkplace!;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    const storage = getAppStorage();
    if (!storage) {
        setUploadError("Storage-Dienst ist nicht initialisiert.");
        setIsUploading(false);
        return;
    }

    const storageRef = ref(storage, `uploads/incidents/${incidentIdentifier}/${Date.now()}_${file.name}`);
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
          form.setValue('attachmentUrl', downloadURL, { shouldDirty: true });
           toast({
            title: 'Upload erfolgreich',
            description: 'Klicken Sie auf Speichern, um die Änderung zu übernehmen.',
          });
        } catch (e: any) {
           setUploadError('Fehler beim Abrufen der Download-URL nach dem Upload.');
        } finally {
            setIsUploading(false)
            setUploadProgress(0);
        }
      }
    );
  }

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
            po: workstation?.POcurrent,
            op: workstation?.OPcurrent,
            lot: workstation?.LOTcurrent,
            components: data.components?.split(',').map(c => c.trim()).filter(c => c) || [],
        };
        
        await addIncident(incidentData, incidentId || undefined);
        
        toast({
            title: incidentId ? "Incident aktualisiert" : "Incident gemeldet",
            description: "Ihre Änderungen wurden erfolgreich gespeichert."
        });
        router.push('/incidents');
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: e.message || "An unknown error occurred."
        })
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isSaveDisabled = !form.formState.isDirty || form.formState.isSubmitting;

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
                {incidentId ? 'Incident bearbeiten' : 'Incident erfassen'}
              </h1>
            </div>
             <Button type="submit" disabled={isSaveDisabled}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Senden
              </Button>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>
                    {incidentId ? `Incident bearbeiten` : 'Neuen Incident melden'}
                </CardTitle>
                 {workstation ? (
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                        <span><Badge variant="outline">AP</Badge> {workstation.AP}</span>
                        <span><Badge variant="outline">PO</Badge> {workstation.POcurrent || 'N/A'}</span>
                        <span><Badge variant="outline">OP</Badge> {workstation.OPcurrent || 'N/A'}</span>
                        <span><Badge variant="outline">LOT</Badge> {workstation.LOTcurrent || 'N/A'}</span>
                    </CardDescription>
                ) : (
                     <CardDescription>
                        Füllen Sie das Formular aus, um ein Problem oder einen Fehler zu melden.
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beschreibung (D0 für ev. Reklamation)</FormLabel>
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
                      name="workplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arbeitsplatz*</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly disabled />
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
                            <Input placeholder="z.B. API, Datenbank (kommagetrennt)" {...field} value={field.value ?? ''} />
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
                            <Input placeholder="E-Mail oder Name des Benutzers" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     
                    <FormField
                      control={form.control}
                      name="attachmentUrl"
                      render={({ field }) => (
                        <FormItem>
                           <FormLabel>Datei-Anhang</FormLabel>
                            <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  variant="outline"
                                  disabled={isUploading}
                                >
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {isUploading ? `Lädt hoch... ${Math.round(uploadProgress)}%` : 'Datei hochladen'}
                                </Button>
                               <FormControl>
                                <Input placeholder="https://..." {...field} value={field.value ?? ''} readOnly className="flex-grow bg-muted" />
                               </FormControl>
                            </div>
                           <FormMessage />
                           {isUploading && <Progress value={uploadProgress} className="mt-2" />}
                           {uploadError && <Alert variant="destructive" className="mt-2"><AlertDescription>{uploadError}</AlertDescription></Alert>}
                            <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                                className="hidden"
                                accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.docx,.xlsx,.pptx"
                            />
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
