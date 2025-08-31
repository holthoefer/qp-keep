
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSamplesForDna, getDnaData, getControlPlan, getControlPlans } from '@/lib/data';
import type { SampleData, DNA, ControlPlan, ProcessStep, Characteristic } from '@/types';
import { DashboardClient } from '@/components/cp/DashboardClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, BarChart, FileSearch } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function ProbenPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const dnaId = searchParams.get('dnaId');
    const [samples, setSamples] = React.useState<SampleData[]>([]);
    const [dna, setDna] = React.useState<DNA | null>(null);
    const [characteristic, setCharacteristic] = React.useState<Characteristic | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!dnaId) {
            setError('Keine DNA-ID in der URL gefunden.');
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [sampleData, dnaData] = await Promise.all([
                    getSamplesForDna(dnaId),
                    getDnaData(dnaId),
                ]);

                if (dnaData.length === 0) {
                    throw new Error(`Keine DNA-Daten für ID ${dnaId} gefunden.`);
                }
                const currentDna = dnaData[0];
                setDna(currentDna);
                setSamples(sampleData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

                // Fetch Control Plan to find the characteristic
                const allPlans = await getControlPlans();
                const currentPlan = allPlans.find(p => p.planNumber === currentDna.CP);
                if (currentPlan) {
                    const currentStep = currentPlan.processSteps.find(ps => ps.processNumber === currentDna.OP);
                    const currentChar = currentStep?.characteristics.find(c => c.itemNumber === currentDna.Char);
                    if (currentChar) {
                        setCharacteristic(currentChar);
                    } else {
                        console.warn(`Merkmal ${currentDna.Char} nicht im Prozessschritt ${currentDna.OP} gefunden.`);
                    }
                } else {
                     console.warn(`Control Plan ${currentDna.CP} nicht gefunden.`);
                }

            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dnaId]);

    const handleRowClick = (sample: SampleData) => {
        router.push(`/probe/${sample.id}`);
    };
    
    const getErfassungUrl = () => {
      if (!dna) return '#';
      const psId = dna.idPs;
      const charId = dna.idChar;
      return `/erfassung?ap=${encodeURIComponent(dna.WP)}&po=${dna.PO}&op=${dna.OP}&charNum=${dna.Char}${psId ? `&ps=${psId}`: ''}${charId ? `&char=${charId}`: ''}`;
  }


    if (isLoading) {
        return (
            <DashboardClient>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </DashboardClient>
        );
    }
    
    if (error) {
        return (
            <DashboardClient>
                <div className="text-center py-10 text-red-600 bg-red-50 rounded-md">
                    <AlertTriangle className="mx-auto h-12 w-12" />
                    <h3 className="mt-2 text-lg font-medium">Fehler beim Laden der Daten</h3>
                    <p className="mt-1 text-sm">{error}</p>
                </div>
            </DashboardClient>
        );
    }

    return (
        <DashboardClient>
            <div className="flex items-center justify-between mb-4">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                </Button>
                 <Link href={getErfassungUrl()}>
                    <Button variant="outline">
                        <BarChart className="mr-2 h-4 w-4" />
                        Zur Erfassung & Chart
                    </Button>
                </Link>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Stichproben-Übersicht</CardTitle>
                    <CardDescription>
                        Alle erfassten Proben für <span className="font-mono font-medium">{dnaId}</span>
                    </CardDescription>
                     {characteristic && (
                        <div className="text-sm text-muted-foreground pt-2">
                           <p>
                             <strong>Merkmal:</strong> {characteristic.itemNumber} - {characteristic.DesciptionSpec}
                           </p>
                           <p>
                             <strong>Spezifikation:</strong> {characteristic.lsl} - {characteristic.usl} {characteristic.units || ''}
                           </p>
                        </div>
                     )}
                </CardHeader>
                <CardContent>
                   <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Zeitstempel</TableHead>
                                <TableHead>Mittelwert</TableHead>
                                <TableHead>StdAbw</TableHead>
                                <TableHead>Werte</TableHead>
                                <TableHead>Ausnahme</TableHead>
                                <TableHead>Notiz</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {samples.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Für diese ID wurden noch keine Stichproben erfasst.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                samples.map(sample => (
                                    <TableRow key={sample.id} onClick={() => handleRowClick(sample)} className="cursor-pointer">
                                        <TableCell>{format(new Date(sample.timestamp), 'dd.MM.yyyy HH:mm:ss')}</TableCell>
                                        <TableCell>{sample.mean.toFixed(4)}</TableCell>
                                        <TableCell>{sample.stddev.toFixed(4)}</TableCell>
                                        <TableCell className="font-mono text-xs">{sample.values.join('; ')}</TableCell>
                                        <TableCell>
                                            {sample.exception && <Badge variant="destructive">Ja</Badge>}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{sample.note}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                   </div>
                </CardContent>
            </Card>
        </DashboardClient>
    );
}

export default function ProbenPageWrapper() {
  return (
    <React.Suspense fallback={
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    }>
        <ProbenPage />
    