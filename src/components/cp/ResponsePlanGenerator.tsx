
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Wand2, Loader2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { ControlPlan, ProcessStep, Characteristic, SampleData, DNA } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { suggestResponsePlan } from '@/ai/flows/suggest-response-plan';


const responsePlanSchema = z.object({
  processStep: z.string().min(1, 'Process step is required.'),
  characteristic: z.string().optional(),
  currentValue: z.string().min(1, 'Investigation values are required.'),
  responsiblePersonRoles: z
    .string()
    .min(3, 'At least one role is required.'),
  lsl: z.string().optional(),
  lcl: z.string().optional(),
  ucl: z.string().optional(),
  usl: z.string().optional(),
  sUCL: z.string().optional(),
  units: z.string().optional(),
  gauge: z.string().optional(),
});

type ResponsePlanFormValues = z.infer<typeof responsePlanSchema>;

interface ResponsePlanGeneratorProps {
    controlPlan: ControlPlan;
    preselectedSample?: SampleData;
    onGenerate?: (result: { suggestedResponsePlan: string; suggestedResponsiblePerson: string }) => void;
}

export function ResponsePlanGenerator({ controlPlan, preselectedSample, onGenerate }: ResponsePlanGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast, dismiss } = useToast();

  const getInitialValues = () => {
    let defaultValues: Partial<ResponsePlanFormValues> = {
        responsiblePersonRoles: 'Quality Engineer, Process Engineer, Operator',
        lsl: '',
        lcl: '',
        ucl: '',
        usl: '',
        sUCL: '',
        units: '',
        gauge: '',
    };
    if (preselectedSample) {
        const ps = controlPlan.processSteps.find(p => p.id === preselectedSample!.characteristicId.split('_')[0]); // This is fragile
        const char = ps?.characteristics.find(c => c.id === preselectedSample!.characteristicId);

        defaultValues = {
            ...defaultValues,
            processStep: ps?.id,
            characteristic: char?.id,
            currentValue: preselectedSample.values.join('; '),
            lsl: String(char?.lsl ?? ''),
            usl: String(char?.usl ?? ''),
            lcl: String(char?.lcl ?? ''),
            ucl: String(char?.ucl ?? ''),
            sUCL: String(char?.sUSL ?? ''),
            units: char?.units ?? '',
            gauge: char?.gauge ?? '',
        };
    }
    return defaultValues;
  };

  const form = useForm<ResponsePlanFormValues>({
    resolver: zodResolver(responsePlanSchema),
    defaultValues: getInitialValues(),
  });

  const watchedProcessStepId = useWatch({ control: form.control, name: 'processStep' });
  const watchedCharacteristicId = useWatch({ control: form.control, name: 'characteristic' });
  const investigationValues = useWatch({ control: form.control, name: 'currentValue' });
  
  const selectedProcessStep = controlPlan.processSteps.find(p => p.id === watchedProcessStepId);
  
  const { mean, stddev, validValues } = useMemo(() => {
    if (!investigationValues) return { mean: 0, stddev: 0, validValues: [] };

    const values = investigationValues
      .split(/[\s;,\n]+/)
      .map(v => v.replace(',', '.'))
      .filter(v => v.trim() !== '' && !isNaN(parseFloat(v)))
      .map(parseFloat);

    if (values.length === 0) return { mean: 0, stddev: 0, validValues: [] };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const stdDeviation = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (values.length > 1 ? values.length - 1 : 1));

    return { mean, stddev: stdDeviation, validValues: values };
  }, [investigationValues]);


  useEffect(() => {
    if (!preselectedSample) {
        form.resetField('characteristic', { defaultValue: '' });
    }
  }, [watchedProcessStepId, form, preselectedSample]);

  useEffect(() => {
     if (selectedProcessStep && watchedCharacteristicId) {
      const selectedCharacteristic = selectedProcessStep.characteristics.find(c => c.id === watchedCharacteristicId);
      if (selectedCharacteristic) {
        form.setValue('lsl', String(selectedCharacteristic.lsl ?? ''));
        form.setValue('lcl', String(selectedCharacteristic.lcl ?? ''));
        form.setValue('ucl', String(selectedCharacteristic.ucl ?? ''));
        form.setValue('usl', String(selectedCharacteristic.usl ?? ''));
        form.setValue('sUCL', String(selectedCharacteristic.sUSL ?? ''));
        form.setValue('units', String(selectedCharacteristic.units ?? ''));
        form.setValue('gauge', String(selectedCharacteristic.gauge ?? ''));
      }
    }
  }, [watchedCharacteristicId, selectedProcessStep, form]);


  async function onSubmit(values: ResponsePlanFormValues) {
    setIsLoading(true);
    const { id: toastId } = toast({
      title: (
        <div className="flex items-center">
          <Wand2 className="mr-2 h-4 w-4" />
          <span>Generating AI Response...</span>
        </div>
      ),
      description: <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait while the AI analyzes the data.</div>,
      duration: 120000,
    });


    const selectedProcess = controlPlan.processSteps.find(p => p.id === values.processStep);
    const selectedCharacteristic = selectedProcess?.characteristics.find(c => c.id === values.characteristic);

    const specificationLimits = `LSL: ${values.lsl || 'N/A'}, USL: ${values.usl || 'N/A'}, LCL: ${values.lcl || 'N/A'}, UCL: ${values.ucl || 'N/A'}, sUCL: ${values.sUCL || 'N/A'}`;

    const inputForAI = {
        processStep: selectedProcess?.processName || values.processStep,
        characteristic: selectedCharacteristic?.DesciptionSpec || '',
        specificationLimits: specificationLimits,
        currentValue: `Individual Values: [${validValues.join(', ')}], Mean: ${mean.toFixed(4)}, Standard Deviation: ${stddev.toFixed(4)}`,
        responsiblePersonRoles: values.responsiblePersonRoles.split(',').map(r => r.trim()),
    };

    try {
      const response = await suggestResponsePlan(inputForAI);
      
      if(onGenerate) {
          onGenerate(response);
          dismiss(toastId);
          return;
      }

      // Fallback to open in new tab if no handler is provided
      const reportHtml = `
        <html>
          <head>
            <title>Action Plan Report</title>
            <style>
              body { font-family: sans-serif; padding: 2rem; }
              .container { max-width: 800px; margin: 0 auto; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
              th { background-color: #f2f2f2; }
              h1, h2, h3 { margin-top: 1.5rem; }
              ul { padding-left: 20px; }
              .no-print { position: fixed; top: 1rem; right: 1rem; }
              @media print { .no-print { display: none; } }
              .spec-violation { color: red; font-weight: bold; }
              .control-violation { color: blue; }
            </style>
          </head>
          <body>
            <div class="container">
              <button class="no-print" onclick="window.print()">Print</button>
              <h1>AI Generated Action Plan</h1>
              <h2>Input Data</h2>
              <table>
                <tr><th>Process Step</th><td>${inputForAI.processStep}</td></tr>
                <tr><th>Characteristic</th><td>${inputForAI.characteristic}</td></tr>
                <tr><th>Specification Limits</th><td>${specificationLimits} (${values.units || 'N/A'})</td></tr>
                <tr><th>Investigation Values</th><td>${validValues.join('; ')}</td></tr>
                <tr><th>Calculated Mean</th><td>${mean.toFixed(4)}</td></tr>
                <tr><th>Calculated StdDev</th><td>${stddev.toFixed(4)}</td></tr>
                <tr><th>Possible Roles</th><td>${inputForAI.responsiblePersonRoles.join(', ')}</td></tr>
              </table>
              <hr/>
              <h2>Suggested Action Plan</h2>
              <div style="white-space: pre-wrap; background-color: #f8f8f8; padding: 1rem; border-radius: 5px; border: 1px solid #eee;">${response.suggestedResponsePlan}</div>
              <h2>Suggested Responsible Person</h2>
              <p><strong>${response.suggestedResponsiblePerson}</strong></p>
            </div>
          </body>
        </html>
      `;

      const newTab = window.open();
      newTab?.document.write(reportHtml);
      newTab?.document.close();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
      dismiss(toastId);
    }
  }
  
  const isGenerateDisabled = !watchedProcessStepId || !watchedCharacteristicId || isLoading || validValues.length === 0;

  return (
    <Card className={cn(preselectedSample && "border-none shadow-none")}>
      {!preselectedSample && (
        <CardHeader>
            <CardTitle>AI-Powered Response Plan</CardTitle>
            <CardDescription>
            Generate a suggested response plan for out-of-specification events.
            </CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-6", preselectedSample && "p-0 pt-4")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!preselectedSample && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="processStep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Process Step</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a process step" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {controlPlan.processSteps.map(step => (
                          <SelectItem key={step.id} value={step.id!}>
                            {step.processNumber} - {step.processName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedProcessStep && (
                <FormField
                  control={form.control}
                  name="characteristic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Characteristic</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} key={watchedProcessStepId}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a characteristic" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {selectedProcessStep.characteristics.map(char => (
                                <SelectItem key={char.id} value={char.id!}>
                                    {char.itemNumber} - {char.DesciptionSpec}
                                </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            )}

            {selectedProcessStep && watchedCharacteristicId && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <FormField control={form.control} name="lsl" render={({ field }) => (
                        <FormItem><FormLabel>LSL</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="lcl" render={({ field }) => (
                        <FormItem><FormLabel>LCL</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="ucl" render={({ field }) => (
                        <FormItem><FormLabel>UCL</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="usl" render={({ field }) => (
                        <FormItem><FormLabel>USL</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name="sUCL" render={({ field }) => (
                        <FormItem><FormLabel>sUCL</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="units" render={({ field }) => (
                        <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="gauge" render={({ field }) => (
                        <FormItem><FormLabel>Gauge</FormLabel><FormControl><Input {...field} readOnly /></FormControl></FormItem>
                    )} />
                 </div>
                 <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investigation Values</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter values separated by space, semicolon or new line..." {...field} rows={4} />
                      </FormControl>
                      <FormDescription>
                          {validValues.length > 0 && `Valid values: ${validValues.length} | Mean: ${mean.toFixed(4)} | StdDev: ${stddev.toFixed(4)}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {!preselectedSample && (
                <FormField
                control={form.control}
                name="responsiblePersonRoles"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Possible Responsible Roles</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Enter roles separated by commas"
                        {...field}
                        />
                    </FormControl>
                    <FormDescription>
                        The AI will suggest a role from this list.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {!preselectedSample && (
                <Button type="submit" disabled={isGenerateDisabled} className="bg-accent hover:bg-accent/90">
                <Wand2 className="mr-2 h-4 w-4" />
                {isLoading ? 'Generating...' : 'Generate Action Plan'}
                </Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
