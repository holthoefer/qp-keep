

'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer, TooltipProps, Dot, Label } from 'recharts';
import type { DNA, SampleData } from '@/types';
import { getSamplesForDna } from '@/lib/data';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data: SampleData = payload[0].payload;
    const note = data.note || '';
    
    // Wrap note text
    const wrapNote = (text: string, lineLength: number) => {
      const regex = new RegExp(`.{1,${lineLength}}`, 'g');
      const lines = text.match(regex) || [];
      return lines.slice(0, 3).join('\n');
    }
    const wrappedNote = wrapNote(note, 20);

    return (
      <div className="bg-background/80 backdrop-blur-sm border border-border p-2 rounded-md shadow-lg text-xs">
        <p className="font-bold">{`x̄: ${payload[0].value}`}</p>
        <p className="text-muted-foreground">{format(new Date(data.timestamp), 'dd.MM.yyyy HH:mm:ss')}</p>
        {data.values && <p className="text-muted-foreground mt-1">x: {data.values.join('; ')}</p>}
        {note && <p className="font-bold mt-1 whitespace-pre-wrap">{wrappedNote}</p>}
        {data.userEmail && <p className="text-muted-foreground text-right pt-1">{data.userEmail}</p>}
      </div>
    );
  }
  return null;
};

const CustomizedDot = (props: any) => {
  const { cx, cy, payload, dnaData } = props;

  const { mean, note, imageUrl } = payload;
  const { LSL, USL, LCL, UCL } = dnaData;

  let fill = "#8884d8"; 

  if ((USL !== undefined && USL !== null && mean > USL) || (LSL !== undefined && LSL !== null && mean < LSL)) {
    fill = "hsl(var(--destructive))";
  } else if ((UCL !== undefined && UCL !== null && mean > UCL) || (LCL !== undefined && LCL !== null && mean < LCL)) {
    fill = "orange";
  }

  if (note || imageUrl) {
      return (
        <g>
            <Dot cx={cx} cy={cy} r={3} fill={fill} />
            <Dot cx={cx} cy={cy} r={7} fill="transparent" stroke={fill} strokeWidth={1} />
        </g>
      );
  }


  return <Dot cx={cx} cy={cy} r={3} fill={fill} />;
};


interface SampleChartProps {
    dnaData: DNA;
    onPointClick: (sampleId: string) => void;
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
        if (dnaData.LSL !== undefined && dnaData.LSL !== null) allValues.push(dnaData.LSL);
        if (dnaData.USL !== undefined && dnaData.USL !== null) allValues.push(dnaData.USL);
        if (allValues.length === 0) return ['auto', 'auto'];
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1 || 1;
        
        return [min - padding, max + padding];
    }, [formattedData, dnaData.LSL, dnaData.USL]);

    const yAxisTickFormatter = (value: number) => {
        return value.toFixed(2);
    };


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
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis domain={yAxisDomain} style={{ fontSize: '12px' }} width={50} tickFormatter={yAxisTickFormatter} />
                <Tooltip content={<CustomTooltip />} />
                
                {dnaData.USL !== undefined && dnaData.USL !== null && (
                    <ReferenceLine y={dnaData.USL} stroke="red" strokeDasharray="3 3" ifOverflow="visible">
                       <Label value="USL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.UCL !== undefined && dnaData.UCL !== null && (
                    <ReferenceLine y={dnaData.UCL} stroke="red" strokeWidth={2} ifOverflow="visible">
                        <Label value="UCL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.CL !== undefined && dnaData.CL !== null && (
                    <ReferenceLine y={dnaData.CL} stroke="grey" ifOverflow="visible">
                        <Label value="CL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.LCL !== undefined && dnaData.LCL !== null && (
                     <ReferenceLine y={dnaData.LCL} stroke="red" strokeWidth={2} ifOverflow="visible">
                        <Label value="LCL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                {dnaData.LSL !== undefined && dnaData.LSL !== null && (
                    <ReferenceLine y={dnaData.LSL} stroke="red" strokeDasharray="3 3" ifOverflow="visible">
                         <Label value="LSL" position="right" fontSize={10} fill="#666" />
                    </ReferenceLine>
                )}
                
                <Line type="linear" dataKey="mean" stroke="#8884d8" activeDot={{ r: 8 }} dot={<CustomizedDot dnaData={dnaData} />} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}
