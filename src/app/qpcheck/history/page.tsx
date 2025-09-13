
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trash2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getQPChecks, deleteQPCheck, type QPCheck } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import logo from '../../Logo.png';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


export default function QPCheckHistoryPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');

  const ap = searchParams.get('ap');
  const po = searchParams.get('po');
  const op = searchParams.get('op');

  const [checks, setChecks] = React.useState<QPCheck[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<QPCheck | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!ap || !po || !op) {
      setError('Fehlende Parameter für den Verlauf.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getQPChecks(ap, po, op);
      setChecks(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ap, po, op]);
  
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteQPCheck(itemToDelete.id);
      toast({ title: 'Eintrag gelöscht' });
      setItemToDelete(null);
      fetchData(); // Refresh list
    } catch (e: any) {
      toast({ title: 'Fehler beim Löschen', description: e.message, variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
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
          <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            qpCheck Verlauf
          </h1>
        </div>
      </header>
       <main className="flex-1 p-4 md:p-6">
        <AlertDialog>
           <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dieser Vorgang kann nicht rückgängig gemacht werden. Der Eintrag wird dauerhaft gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Verlauf für Prozess</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                        <span><Badge variant="outline">AP</Badge> {ap}</span>
                        <span><Badge variant="outline">PO</Badge> {po}</span>
                        <span><Badge variant="outline">OP</Badge> {op}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Datum</TableHead>
                                    <TableHead>Bewertung</TableHead>
                                    <TableHead>Bemerkung</TableHead>
                                    <TableHead>Benutzer</TableHead>
                                    {isAdmin && <TableHead className="text-right">Aktion</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center text-muted-foreground">
                                            Keine Einträge für diesen Prozess gefunden.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    checks.map((check) => (
                                        <TableRow key={check.id}>
                                            <TableCell>{format(check.timestamp.toDate(), 'dd.MM.yyyy HH:mm')}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-4 w-4 ${i < check.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-sm whitespace-pre-line">{check.note}</TableCell>
                                            <TableCell>{check.userEmail}</TableCell>
                                            {isAdmin && (
                                                <TableCell className="text-right">
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => setItemToDelete(check)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </AlertDialog>
      </main>
    </div>
  );
}
