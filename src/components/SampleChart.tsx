
'use client';

import * as React from 'react';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';

interface SampleChartProps {
    dnaData: DNA;
    onPointClick: (sampleId: string, isLatest: boolean) => void;
}

export function SampleChart({ dnaData, onPointClick }: SampleChartProps) {
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
        mean: parseFloat(sample.mean.toFixed(4)),
    })), [data]);

    const yAxisDomain = React.useMemo(() => {
        const allValues = formattedData.map(d => d.mean);
        if (dnaData.LSL !== undefined) allValues.push(dnaData.LSL);
        if (dnaData.USL !== undefined) allValues.push(dnaData.USL);
        if (allValues.length === 0) return [0, 0];
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1;
        
        return [min - padding, max + padding];
    }, [formattedData, dnaData.LSL, dnaData.USL]);


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
                <YAxis domain={yAxisDomain} style={{ fontSize: '12px' }} width={50} />
                <Tooltip 
                    contentStyle={{ fontSize: '12px', padding: '5px' }}
                    labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                {dnaData.LSL !== undefined && <ReferenceLine y={dnaData.LSL} label={{ value: "LSL", fontSize: 10, position: 'insideBottomLeft' }} stroke="red" strokeDasharray="3 3" />}
                {dnaData.LCL !== undefined && <ReferenceLine y={dnaData.LCL} label={{ value: "LCL", fontSize: 10, position: 'insideBottomLeft' }} stroke="blue" strokeDasharray="3 3" />}
                {dnaData.CL !== undefined && <ReferenceLine y={dnaData.CL} label={{ value: "CL", fontSize: 10, position: 'insideBottomLeft' }} stroke="green" />}
                {dnaData.UCL !== undefined && <ReferenceLine y={dnaData.UCL} label={{ value: "UCL", fontSize: 10, position: 'insideTopLeft' }} stroke="blue" strokeDasharray="3 3" />}
                {dnaData.USL !== undefined && <ReferenceLine y={dnaData.USL} label={{ value: "USL", fontSize: 10, position: 'insideTopLeft' }} stroke="red" strokeDasharray="3 3" />}
                <Line type="monotone" dataKey="mean" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}
