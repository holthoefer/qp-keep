
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, CheckSquare, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { addQPCheck } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import logo from '../Logo.png';


export default function QPCheckerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const ap = searchParams.get('ap');
  const po = searchParams.get('po');
  const op = searchParams.get('op');
  const lot = searchParams.get('lot');

  const [note, setNote] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ap || !po || !op || !lot) {
      setError('Fehlende Parameter. Bitte rufen Sie diese Seite von einem Arbeitsplatz aus auf.');
    }
  }, [ap, po, op, lot]);

  const handleSave = async () => {
    if (isSaving || !ap || !po || !op || !lot || !user) {
      return;
    }
    
    if (rating === 0) {
        toast({
            variant: 'destructive',
            title: 'Bewertung erforderlich',
            description: 'Bitte geben Sie eine Bewertung ab.',
        });
        return;
    }

    if (rating < 5 && !note.trim()) {
        toast({
            variant: 'destructive',
            title: 'Bemerkung erforderlich',
            description: 'Bitte geben Sie eine Bemerkung an, wenn die Bewertung unter 5 Sternen liegt.',
        });
        return;
    }

    setIsSaving(true);
    try {
      await addQPCheck({
        ap,
        po,
        op,
        lot,
        rating,
        note,
      });

      toast({
        title: 'qpCheck erfolgreich!',
        description: 'Der Prozess wurde als stabil bestätigt.',
      });
      router.push('/arbeitsplaetze');
    } catch (e: any) {
      console.error('Error saving qpCheck:', e);
      toast({
        variant: 'destructive',
        title: 'Fehler beim Speichern',
        description: e.message || 'Ein unbekannter Fehler ist aufgetreten.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authLoading) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => router.push('/arbeitsplaetze')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zu den Arbeitsplätzen
            </Button>
        </div>
      );
  }

  const isSaveDisabled = isSaving || rating === 0 || (rating < 5 && !note.trim());

  return (
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
          </Button>
          <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            qpCheck
          </h1>
        </div>
      </header>
       <main className="flex-1 p-4 md:p-6">
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-6 w-6 text-primary" />
                    Prozess-Bestätigung
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                    <span><Badge variant="outline">AP</Badge> {ap}</span>
                    <span><Badge variant="outline">PO</Badge> {po}</span>
                    <span><Badge variant="outline">OP</Badge> {op}</span>
                    <span><Badge variant="outline">LOT</Badge> {lot}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert variant="info">
                    <AlertTitle>Wichtiger Hinweis</AlertTitle>
                    <AlertDescription>
                        Prüfe alle Merkmale nach Zeichnung und Richtlinien. Mit dem Speichern wird bestätigt, dass der Prozess stabil läuft und Abweichungen hier notiert sind.
                    </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <label htmlFor="rating" className="text-sm font-medium">Bewertung</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Button
                                key={star}
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setRating(star)}
                                className="text-amber-400 hover:text-amber-500"
                            >
                                <Star className={rating >= star ? 'fill-current' : ''} />
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="note" className="text-sm font-medium">
                        Bemerkung {rating > 0 && rating < 5 && <span className="text-destructive">*</span>}
                    </label>
                    <Textarea
                        id="note"
                        placeholder="Notieren Sie hier eventuelle Abweichungen oder Beobachtungen..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={5}
                        disabled={isSaving}
                        required={rating < 5 && rating > 0}
                    />
                </div>
            </CardContent>
             <CardFooter className="flex flex-col items-start gap-4">
                <Button onClick={handleSave} disabled={isSaveDisabled} className="w-full">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Speichern & Bestätigen
                </Button>
                <p className="text-xs text-muted-foreground">
                    Ihre E-Mail ({user?.email}) und der Zeitstempel werden automatisch erfasst.
                </p>
            </CardFooter>
        </Card>
      </main>
    </div>
  );
}
