
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Cell } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { ImageIcon } from 'lucide-react';

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data: SampleData = payload[0].payload;
    return (
      <div className="bg-background/80 backdrop-blur-sm border border-border p-2 rounded-md shadow-lg text-xs">
        <p className="font-bold">{`Wert: ${payload[0].value}`}</p>
        <p className="text-muted-foreground">{format(new Date(data.timestamp), 'dd.MM.yyyy HH:mm:ss')}</p>
      </div>
    );
  }
  return null;
};

const CustomizedLabel = (props: any) => {
    const { x, y, width, payload } = props;
    if (payload && payload.imageUrl) {
        return (
             <g transform={`translate(${x + width / 2}, ${y - 10})`}>
                <foreignObject x={-8} y={-8} width={16} height={16}>
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </foreignObject>
            </g>
        );
    }
    return null;
};

const CustomXAxisTick = (props: any) => {
    const { x, y, payload, chartData } = props;
    if (!payload || !chartData) return null;
    
    const tickValue = payload.value;
    
    const dataPoint = chartData.find((d: any) => d.name === tickValue);
    const imageUrl = dataPoint?.imageUrl;
    const isBlue = !!imageUrl;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill={isBlue ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} style={{ fontSize: '10px' }} transform="rotate(-35)">
                {tickValue}
            </text>
        </g>
    );
};

interface BarChartComponentProps {
    dnaData: DNA;
    onPointClick: (sampleId: string) => void;
}

export function BarChartComponent({ dnaData, onPointClick }: BarChartComponentProps) {
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

    const formattedData = React.useMemo(() => 
        data.map(sample => {
            const defectiveCount = sample.values.reduce((sum, val) => sum + (val === 1 ? 1 : 0), 0);
            return {
                ...sample,
                value: defectiveCount,
                name: `${new Date(sample.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
            };
        }).slice(-50),
    [data]);

    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }
    
    const handleChartClick = (e: any) => {
        if (e && e.activePayload && e.activePayload.length > 0) {
            const sampleId = e.activePayload[0].payload.id;
            onPointClick(sampleId);
        }
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={<CustomXAxisTick chartData={formattedData} />} interval="preserveStartEnd" />
                <YAxis style={{ fontSize: '12px' }} width={30} allowDecimals={false} />
                <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{fill: 'rgba(206, 212, 218, 0.2)'}}
                />
                <Bar dataKey="value" fill="#8884d8" label={<CustomizedLabel />}>
                    {
                        formattedData.map((entry, index) => {
                             return <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'hsl(var(--destructive))' : '#8884d8'}/>
                        })
                    }
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
