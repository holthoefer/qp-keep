
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { getWorkstations, addIncident } from '@/lib/data';
import type { Workstation, IncidentPriority, IncidentType, IncidentTeam } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { KeepKnowLogo } from '@/components/icons';

const incidentSchema = z.object({
  workplace: z.string().min(1, { message: 'Workplace is required.' }),
  title: z.string().min(1, { message: 'Incident title is required.' }),
  reportedAt: z.date({ required_error: 'A date and time of reporting is required.' }),
  priority: z.enum(['Niedrig', 'Mittel', 'Hoch', 'Kritisch']),
  type: z.enum(['Bug', 'Performance', 'Ausfall', 'Sonstiges']),
  description: z.string().min(1, { message: 'Description is required.' }),
  team: z.enum(['Backend-Team', 'Frontend-Team', 'DevOps', 'QA', 'Sonstiges']),
  components: z.string().optional(),
  attachments: z.any().optional(), // For simplicity, not handling file objects yet
  affectedUser: z.string().optional(),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function IncidentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [workstations, setWorkstations] = React.useState<Workstation[]>([]);
  const [loadingWorkstations, setLoadingWorkstations] = React.useState(true);

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
      title: '',
      reportedAt: new Date(),
      priority: 'Mittel',
      type: 'Bug',
      description: '',
      team: 'Frontend-Team',
      components: '',
      affectedUser: '',
    },
  });

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
            reportedAt: data.reportedAt,
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
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Incident Erfassung
          </h1>
        </div>
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="workplace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arbeitsplatz*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValuechange={field.onChange} defaultValue={field.value}>
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
            
            <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Anhänge</FormLabel>
                        <FormControl>
                            <Input type="file" {...field} />
                        </FormControl>
                        <FormDescription>
                            Screenshots, Logs, etc. (.jpg, .png, .pdf, .txt)
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />


            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Incident melden
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </main>
    </div>
  );
}
