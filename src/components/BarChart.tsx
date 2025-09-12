
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, Cell, LabelList } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { ImageIcon } from 'lucide-react';
import { generateThumbnailUrl } from '@/lib/image-utils';
import Image from 'next/image';

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data: SampleData = payload[0].payload;
    const defects = data.defects ?? 0;
    const goodParts = data.goodParts ?? 0;
    return (
      <div className="bg-background/80 backdrop-blur-sm border border-border p-2 rounded-md shadow-lg text-xs">
        <div className="flex justify-between items-center">
            <p className="font-bold">{`Fehlerhafte Teile: ${defects}`}</p>
            {data.imageUrl && <ImageIcon className="h-4 w-4 ml-2 text-primary" />}
        </div>
        <p>{`Gute Teile: ${goodParts}`}</p>
        <p className="text-muted-foreground">{format(new Date(data.timestamp), 'dd.MM.yyyy HH:mm:ss')}</p>
      </div>
    );
  }
  return null;
};

const CustomizedLabel = (props: any) => {
    const { x, y, width, value, payload } = props;
    if (payload && payload.imageUrl) {
        return (
             <g transform={`translate(${x + width / 2}, ${y - 4})`}>
                <foreignObject x={-16} y={-36} width={32} height={32}>
                    <Image 
                        src={generateThumbnailUrl(payload.imageUrl)} 
                        alt="Sample thumbnail"
                        width={32}
                        height={32}
                        className="rounded-sm border-2 border-primary"
                    />
                </foreignObject>
            </g>
        );
    }
    return null;
};

const CustomXAxisTick = (props: any) => {
    const { x, y, payload, chartData } = props;
    if (!payload || !payload.value) return null;

    const dataPoint = chartData?.find((d: any) => d.name === payload.value);
    
    const hasImage = !!dataPoint?.imageUrl;

    const style = {
        fontSize: hasImage ? '14px' : '12px',
        fontWeight: hasImage ? 'bold' : 'normal',
        fill: 'hsl(var(--muted-foreground))',
    };

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" style={style} transform="rotate(-35)">
                {payload.value}
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

    const formattedData = React.useMemo(() => {
        return data.map(sample => {
            const sampleSize = sample.sampleSize ?? dnaData.SampleSize ?? 0;
            const defects = sample.defects ?? 0;
            const goodParts = sampleSize - defects;
            return {
                ...sample,
                defects: defects,
                goodParts: goodParts > 0 ? goodParts : 0,
                name: `${new Date(sample.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
            };
        }).slice(-50);
    }, [data, dnaData.SampleSize]);

    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }
    
    const handleChartClick = (e: any) => {
        if (e && e.activePayload && e.activePayload.length > 0) {
            const sampleId = e.activePayload[0].payload.id;
            onPointClick(sampleId);
        }
    }
    
    const sampleSize = dnaData.SampleSize || 0;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 40, right: 30, left: 0, bottom: 20 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={<CustomXAxisTick chartData={formattedData} />} interval="preserveStartEnd" />
                <YAxis style={{ fontSize: '12px' }} width={30} allowDecimals={false} domain={[0, sampleSize > 0 ? sampleSize : 'auto']} />
                <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{fill: 'rgba(206, 212, 218, 0.2)'}}
                />
                <Bar dataKey="defects" stackId="a" fill="hsl(var(--destructive))" />
                <Bar dataKey="goodParts" stackId="a" fill="#8884d8">
                     <LabelList dataKey="defects" content={<CustomizedLabel />} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
