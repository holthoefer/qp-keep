
'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';

interface SChartProps {
    dnaData: DNA;
    onPointClick: (sampleId: string, isLatest: boolean) => void;
}

export function SChart({ dnaData, onPointClick }: SChartProps) {
    const [data, setData] = React.useState<SampleData[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
             if (!dnaData.idDNA) return;
            setIsLoading(true);
            try {
                const samples = await getSamplesForDna(dnaData.idDNA, 50);
                setData(samples);
            } catch (error) {
                console.error("Failed to fetch samples for chart", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [dnaData.idDNA]);

    const formattedData = React.useMemo(() => data.map(sample => ({
        ...sample,
        name: new Date(sample.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        stddev: parseFloat(sample.stddev.toFixed(4)),
    })), [data]);
    
    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }
    
    const handleChartClick = (e: any) => {
        if (e && e.activePayload && e.activePayload.length > 0) {
            const sampleId = e.activePayload[0].payload.id;
            const isLatest = e.activePayload[0].payload.id === data[data.length -1]?.id;
            onPointClick(sampleId, isLatest);
        }
    }


    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} width={50} />
                <Tooltip 
                     contentStyle={{ fontSize: '12px', padding: '5px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                {dnaData.sUSL !== undefined && <ReferenceLine y={dnaData.sUSL} label={{ value: "sUSL", fontSize: 10, position: 'insideTopLeft' }} stroke="orange" strokeDasharray="3 3" />}
                <Line type="monotone" dataKey="stddev" name="StdDev" stroke="#82