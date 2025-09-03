

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { ControlPlan, ControlPlanStatus, CharType, ProcessStep, Characteristic, StorageFile } from '@/types';
import { ResponsePlanGenerator } from './ResponsePlanGenerator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { PlusCircle, Trash2, FileText, ChevronDown, ChevronsDown, ChevronsUp, ArrowLeft, Image as ImageIcon, Settings, LibraryBig, UploadCloud, Copy, CopyPlus, AlertTriangle, MoreVertical, Save, FileDown, Printer, Wand2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ImageModal } from './ImageModal';
import { StorageBrowser } from './StorageBrowser';
import { getAppStorage } from '@/lib/data';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth-context';
import { suggestResponsePlan } from '@/ai/flows/suggest-response-plan';
import { generateThumbnailUrl } from '@/lib/image-utils';

// Custom Zod preprocessor to handle empty strings for number fields
const emptyStringToUndefined = z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return undefined;
    if (val === null) return undefined;
    return val;
}, z.any());


const optionalNumberSchema = emptyStringToUndefined.pipe(z.coerce.number({
  invalid_type_error: "Muss eine Zahl sein",
}).optional());

const optionalIntegerSchema = emptyStringToUndefined.pipe(z.coerce.number().int({
    message: "Muss eine ganze Zahl sein"
}).optional());


const characteristicSchema = z.object({
    id: z.string(),
    itemNumber: z.string().min(1, { message: "Item # is required." }),
    DesciptionSpec: z.string().optional().nullable(),
    ctq: z.boolean().optional(),
    product: z.string().optional().nullable(),
    process: z.string().optional().nullable(),
    nominal: optionalNumberSchema,
    lsl: optionalNumberSchema,
    usl: optionalNumberSchema,
    lcl: optionalNumberSchema,
    cl: optionalNumberSchema,
    ucl: optionalNumberSchema,
    sUSL: optionalNumberSchema,
    units: z.string().optional().nullable(),
    gauge: z.string().optional().nullable(),
    sampleSize: optionalIntegerSchema,
    frequency: optionalIntegerSchema,
    charType: z.enum(['P', 'L', 'A']),
    controlMethod: z.string().optional().nullable(),
    reactionPlan: z.string().optional().nullable(),
    Instruction: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
});

const processStepSchema = z.object({
    id: z.string(),
    processNumber: z.string().min(1, { message: "Process number is required." }),
    processName: z.string().optional().nullable(),
    processDescription: z.string().optional().nullable(),
    machineDevice: z.string().optional().nullable(),
    remark: z.string().optional().nullable(),
    characteristics: z.array(characteristicSchema).min(1, { message: "At least one characteristic is required." }),
    imageUrl: z.string().optional().nullable(),
});

const formSchema = z.object({
  id: z.string().optional(),
  partName: z.string().min(1, 'Part name is required.'),
  partNumber: z.string().min(1, 'Part number is required.'),
  planNumber: z.string().min(1, 'Plan number is required.'),
  planDescription: z.string().optional().nullable(),
  revisionDate: z.string().optional(),
  version: z.coerce.number().int().optional(),
  status: z.enum(['Draft', 'For Review', 'Approved', 'Active', 'Inactive', 'Rejected']).optional(),
  processSteps: z.array(processStepSchema).optional(),
  supplierPlant: z.string().optional().nullable(),
  supplierCode: z.string().optional().nullable(),
  keyContact: z.string().optional().nullable(),
  coreTeam: z.string().optional().nullable(),
  plantApprovalDate: z.string().optional().nullable(),
  otherApproval: z.string().optional().nullable(),
  originalFirstDate: z.string().optional().nullable(),
  customerEngineeringApprovalDate: z.string().optional().nullable(),
  customerQualityApprovalDate: z.string().optional().nullable(),
  otherApprovalDate: z.string().optional().nullable(),
  generalInformation: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  lastChangedBy: z.string().optional(),
});

type ControlPlanFormValues = z.infer<typeof formSchema>;

type ControlPlanFormProps = {
  onSubmit: (data: ControlPlan) => Promise<void>;
  initialData?: ControlPlan | null;
  onClose?: () => void;
};

// Helper function to convert nulls/empty strings to undefined for number fields
const cleanNumber = (value: any): number | undefined => {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
}

const generateTempId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const getDefaultCharacteristic = (itemNumber: string = '1'): Characteristic => ({
    id: generateTempId('char'),
    itemNumber: itemNumber, 
    DesciptionSpec: '', 
    ctq: false, 
    product: '', 
    process: '', 
    nominal: undefined, 
    lsl: undefined, 
    usl: undefined, 
    lcl: undefined,
    cl: undefined,
    ucl: undefined,
    sUSL: undefined,
    units: '', 
    gauge: '', 
    sampleSize: undefined, 
    frequency: undefined, 
    charType: 'A', 
    controlMethod: '', 
    reactionPlan: '',
    Instruction: '',
    imageUrl: '',
});


export function ControlPlanForm({ onSubmit, initialData, onClose }: ControlPlanFormProps) {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const formatDateForInput = (date?: string | null) => date ? new Date(date).toISOString().split('T')[0] : '';
  const [isBackAlertOpen, setIsBackAlertOpen] = useState(false);
  const [openProcessAccordions, setOpenProcessAccordions] = useState<string[]>([]);
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');
  const { toast } = useToast();


  const handleImageClick = (url: string, alt: string) => {
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsModalOpen(true);
  };


  const sortCharacteristics = (characteristics: Characteristic[]): Characteristic[] => {
    return [...characteristics].sort((a, b) => {
        return a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true, sensitivity: 'base' });
    });
  };
  
  const getDefaultValues = React.useCallback((): Partial<ControlPlanFormValues> => {
    const defaultProcessStep: ProcessStep = { 
        id: generateTempId('ps'),
        processNumber: 'OP-10', 
        processName: 'Initial Step', 
        processDescription: '', 
        machineDevice: '', 
        remark: '', 
        imageUrl: '',
        characteristics: [getDefaultCharacteristic()] 
    };
    
     if (!initialData) {
        return {
            partName: '',
            partNumber: '',
            planNumber: `CP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3,'0')}`,
            revisionDate: new Date().toISOString().split('T')[0],
            version: 1,
            status: 'Draft',
            processSteps: [defaultProcessStep],
        };
    }
    
     const sortedSteps = [...initialData.processSteps].sort((a, b) => {
        if (!a.processNumber) return 1;
        if (!b.processNumber) return -1;
        return a.processNumber.localeCompare(b.processNumber, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    return {
        ...initialData,
        id: initialData.id,
        planDescription: initialData.planDescription || undefined,
        imageUrl: initialData.imageUrl || undefined,
        generalInformation: initialData.generalInformation || undefined,
        supplierPlant: initialData.supplierPlant || undefined,
        supplierCode: initialData.supplierCode || undefined,
        keyContact: initialData.keyContact || undefined,
        coreTeam: initialData.coreTeam || undefined,
        otherApproval: initialData.otherApproval || undefined,
        revisionDate: formatDateForInput(initialData.revisionDate),
        plantApprovalDate: formatDateForInput(initialData.plantApprovalDate) || undefined,
        originalFirstDate: formatDateForInput(initialData.originalFirstDate) || undefined,
        customerEngineeringApprovalDate: formatDateForInput(initialData.customerEngineeringApprovalDate) || undefined,
        customerQualityApprovalDate: formatDateForInput(initialData.customerQualityApprovalDate) || undefined,
        otherApprovalDate: formatDateForInput(initialData.otherApprovalDate) || undefined,
        processSteps: sortedSteps.map(ps => ({
            ...ps,
            id: ps.id || generateTempId('ps'),
            characteristics: sortCharacteristics(ps.characteristics).map(char => ({
                ...char,
                id: char.id || generateTempId('char'),
                ctq: char.ctq ?? false,
                nominal: cleanNumber(char.nominal),
                lsl: cleanNumber(char.lsl),
                usl: cleanNumber(char.usl),
                lcl: cleanNumber(char.lcl),
                cl: cleanNumber(char.cl),
                ucl: cleanNumber(char.ucl),
                sUSL: cleanNumber(char.sUSL),
                sampleSize: cleanNumber(char.sampleSize),
                frequency: cleanNumber(char.frequency),
            }))
        }))
    }
  }, [initialData, formatDateForInput]);


  const form = useForm<ControlPlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });
  
  useEffect(() => {
    form.reset(getDefaultValues());
  }, [initialData, form, getDefaultValues]);

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "processSteps",
  });

  const allProcessAccordionItems = fields.map((_, index) => `ps-item-${index}`);

  const sortedFields = React.useMemo(() => {
    const processSteps = form.getValues('processSteps') || [];
    return fields
        .map((field, index) => ({ ...field, originalIndex: index, processNumber: processSteps[index]?.processNumber }))
        .sort((a, b) => {
            if (!a.processNumber) return 1;
            if (!b.processNumber) return -1;
            return a.processNumber.localeCompare(b.processNumber, undefined, { numeric: true, sensitivity: 'base' });
        });
  }, [fields, form.watch('processSteps')]);
  
  const executeSave = async (values: ControlPlanFormValues) => {
    const dataToSubmit: ControlPlan = {
      ...values,
      id: initialData?.id || '',
      status: values.status || 'Draft',
      version: values.version || 1,
      revisionDate: values.revisionDate || new Date().toISOString().split('T')[0],
      processSteps: values.processSteps || [],
    };
    
    try {
        await onSubmit(dataToSubmit);
        form.reset(dataToSubmit); // Reset form with submitted data to clear dirty state
    } catch (error: any) {
         toast({
            title: 'Error Saving Plan',
            description: error.message,
            variant: 'destructive',
        });
    }
  }
  
  const handleExportCsv = () => {
    try {
        const plan = form.getValues();
        if (!plan.processSteps) {
            toast({ title: "Export nicht möglich", description: "Es sind keine Prozessschritte zum Exportieren vorhanden.", variant: "destructive" });
            return;
        }

        const escapeCsvField = (field: any): string => {
            if (field === null || field === undefined) return '';
            const stringField = String(field).replace(/(\r\n|\n|\r)/gm, " ");
            if (stringField.includes(';') || stringField.includes('"') || stringField.includes(',')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        const planHeaderKeys: (keyof ControlPlan)[] = [ 'planNumber', 'partNumber', 'partName', 'planDescription', 'revisionDate', 'status', 'version', 'supplierPlant', 'supplierCode', 'keyContact', 'coreTeam', 'plantApprovalDate', 'otherApproval', 'originalFirstDate', 'customerEngineeringApprovalDate', 'customerQualityApprovalDate', 'otherApprovalDate', 'generalInformation', 'imageUrl' ];
        const processStepHeaderKeys: (keyof ProcessStep)[] = [ 'processNumber', 'processName', 'processDescription', 'machineDevice', 'remark', 'imageUrl' ];
        const characteristicHeaderKeys: (keyof Characteristic)[] = [ 'itemNumber', 'DesciptionSpec', 'ctq', 'product', 'process', 'nominal', 'lsl', 'usl', 'lcl', 'cl', 'ucl', 'sUSL', 'units', 'gauge', 'sampleSize', 'frequency', 'charType', 'controlMethod', 'reactionPlan', 'Instruction', 'imageUrl' ];
        
        const headers = [
            ...planHeaderKeys.map(k => `plan_${k}`),
            ...processStepHeaderKeys.map(k => `step_${k}`),
            ...characteristicHeaderKeys.map(k => `char_${k}`)
        ].join(';');

        const rows = plan.processSteps.flatMap(step => 
            step.characteristics.map(char => {
                const planData = planHeaderKeys.map(key => escapeCsvField((plan as any)[key]));
                const stepData = processStepHeaderKeys.map(key => escapeCsvField(step[key as keyof typeof step]));
                const charData = characteristicHeaderKeys.map(key => escapeCsvField(char[key as keyof typeof char]));
                return [...planData, ...stepData, ...charData].join(';');
            })
        );

        const csvContent = [headers, ...rows].join('\r\n');
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${plan.planNumber}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "CSV Export erfolgreich", description: `${plan.planNumber}.csv wird heruntergeladen.` });
    } catch (error: any) {
        toast({ title: "Fehler beim CSV-Export", description: error.message || "Unbekannter Fehler", variant: "destructive" });
    }
  }

  const handleBack = () => {
    if (form.formState.isDirty) {
        setIsBackAlertOpen(true);
    } else {
        if(onClose) {
            onClose();
        } else {
            router.push('/cp');
        }
    }
  };

  const { isDirty, isSubmitting } = form.formState;
  const isSaveDisabled = !isAdmin || isSubmitting || !isDirty;
  const isReadOnly = !!initialData?.id;

  return (
    <>
    <ImageModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
    />
    <Form {...form}>
        <AlertDialog open={isBackAlertOpen} onOpenChange={setIsBackAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to discard them and go back?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                     <AlertDialogCancel>Stay on page</AlertDialogCancel>
                     <AlertDialogAction onClick={onClose || (() => router.push('/cp'))}>Discard and Go Back</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


      <form
        onSubmit={form.handleSubmit(executeSave, (errors) => {
             console.error("Form validation errors:", errors);
             toast({
                title: "Validation Error",
                description: "Please check the form for errors before saving.",
                variant: "destructive"
            })
        })}
        className="flex flex-col h-full bg-muted/20"
      >
        <header className="flex-shrink-0 px-4 flex justify-between items-center sticky top-0 bg-background z-10 py-3 border-b">
            <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={handleBack} className="flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className='truncate'>
                    <h1 className="text-lg font-semibold">{initialData ? 'Edit Control Plan' : 'Create New Control Plan'}</h1>
                    <p className='truncate text-xs text-muted-foreground'>
                        {initialData ? `Editing ${initialData.planNumber}` : "Fill in the details to create a new plan"}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSaveDisabled}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </header>

        <main className="flex-grow overflow-y-auto p-4 md:p-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="process" disabled={isReadOnly ? false : true}>Details</TabsTrigger>
                <TabsTrigger value="ai-plan" disabled={isReadOnly ? false : true}>AI Exp.</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">General Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <FormField control={form.control} name="planNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plan Number (Key)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            readOnly={isReadOnly}
                                            disabled={isReadOnly || !isAdmin}
                                            className={cn(
                                                'font-bold',
                                                isReadOnly ? 'cursor-not-allowed' : 'bg-green-100 dark:bg-green-900/50'
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="partName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Main Gear Assembly" {...field} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="partNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Part Number</FormLabel>
                                    <FormControl><Input placeholder="e.g., PN-12345" {...field} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="supplierPlant" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier/Plant (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Main Factory" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="supplierCode" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier Code (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., S-001" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="keyContact" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Key Contact (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., John Doe" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="coreTeam" render={({ field }) => (
                                <FormItem className="lg:col-span-3">
                                    <FormLabel>Core Team (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., J. Doe, A. Smith" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdmin}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {(['Draft', 'For Review', 'Approved', 'Active', 'Inactive', 'Rejected'] as ControlPlanStatus[]).map(status => (
                                                <SelectItem key={status} value={status}>{status}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="version" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Version</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="revisionDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Revision Date</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="originalFirstDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Original First Date (Optional)</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="plantApprovalDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plant Approval Date (Optional)</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="customerEngineeringApprovalDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer Eng. Approval (Optional)</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="customerQualityApprovalDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Customer Q. Approval (Optional)</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="otherApproval" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Other Approval (Optional)</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="otherApprovalDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Other Approval Date (Optional)</FormLabel>
                                    <FormControl><Input type="date" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="planDescription" render={({ field }) => (
                                <FormItem className="lg:col-span-3">
                                    <FormLabel>Plan Description (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="Overall plan description..." {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="generalInformation" render={({ field }) => (
                                <FormItem className="lg:col-span-3">
                                    <FormLabel>General Information (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="General notes about this control plan..." {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <ImageUploader 
                            form={form} 
                            fieldName="imageUrl"
                            entityName="ControlPlan"
                            entityId={form.getValues('id')}
                            planNumber={form.getValues('planNumber')}
                            onImageClick={handleImageClick}
                        />
                    </CardContent>
                 </Card>
              </TabsContent>
              <TabsContent value="process">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Process &amp; Characteristics</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setOpenProcessAccordions(allProcessAccordionItems)}>
                                    <ChevronsDown className="mr-2 h-4 w-4" /> Expand All
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setOpenProcessAccordions([])}>
                                    <ChevronsUp className="mr-2 h-4 w-4" /> Collapse All
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Accordion type="multiple" className="w-full" value={openProcessAccordions} onValueChange={setOpenProcessAccordions}>
                            {sortedFields.map((field) => (
                              <ProcessStepAccordion
                                key={field.id}
                                form={form}
                                processStepIndex={field.originalIndex}
                                controlPlanId={form.getValues('id')}
                                planNumber={form.getValues('planNumber')}
                                onImageClick={handleImageClick}
                                onDuplicate={() => {
                                    const processStepToDuplicate = form.getValues(`processSteps.${field.originalIndex}`);
                                    const duplicatedStep = {
                                        ...processStepToDuplicate,
                                        id: generateTempId('ps'),
                                        processNumber: `${processStepToDuplicate.processNumber}-COPY`,
                                        characteristics: processStepToDuplicate.characteristics.map(c => ({
                                            ...c,
                                            id: generateTempId('char')
                                        }))
                                    };
                                    insert(field.originalIndex + 1, duplicatedStep);
                                }}
                              />
                            ))}
                        </Accordion>
                        <div className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: generateTempId('ps'), processNumber: `OP-${((form.getValues('processSteps')?.length || 0) + 1) * 10}`, processName: '', processDescription: '', machineDevice: '', remark: '', imageUrl: '', characteristics: [getDefaultCharacteristic(String(fields.length + 1))] })} disabled={!isAdmin}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add Process Step
                            </Button>
                        </div>
                         <FormMessage>{form.formState.errors.processSteps?.message}</FormMessage>
                    </CardContent>
                 </Card>
              </TabsContent>
              <TabsContent value="ai-plan">
                <ResponsePlanGenerator controlPlan={form.getValues()} />
              </TabsContent>
            </Tabs>
        </main>
        <footer className="flex-shrink-0 px-6 py-4 border-t gap-2 bg-background flex items-center">
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={!initialData}>
                <FileDown className="mr-2 h-4 w-4" />
                CSV-Export
            </Button>
        </footer>
      </form>
    </Form>
    </>
  );
}


const ProcessStepAccordion = ({ form, processStepIndex, controlPlanId, planNumber, onImageClick, onDuplicate }: { form: any, processStepIndex: number, controlPlanId?: string, planNumber?: string, onImageClick: (url: string, alt: string) => void, onDuplicate: () => void }) => {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin');
    
    const { fields, append, remove: removeCharacteristic, insert: insertCharacteristic } = useFieldArray({
        control: form.control,
        name: `processSteps.${processStepIndex}.characteristics`,
    });
    
    const { remove: removeProcessStep } = useFieldArray({
        control: form.control,
        name: "processSteps",
    });

    const [openCharAccordions, setOpenCharAccordions] = useState<string[]>([]);
    const allCharAccordionItems = fields.map((_, index) => `char-item-${index}`);

    const processNumber = form.watch(`processSteps.${processStepIndex}.processNumber`);
    const processName = form.watch(`processSteps.${processStepIndex}.processName`);
    const processStepId = form.watch(`processSteps.${processStepIndex}.id`);


    return (
        <AccordionItem value={`ps-item-${processStepIndex}`} className="border rounded-md bg-muted/50 overflow-hidden">
             <Card className="bg-muted/50 overflow-hidden border-none shadow-none">
                <AccordionTrigger className="p-4 hover:bg-accent/10 group cursor-pointer text-left">
                    <div className="flex flex-1 items-center justify-between">
                         <div className="flex items-center gap-4 flex-1">
                            <div className='text-left'>
                                <p className="font-semibold">{processNumber || 'New Process Step'}</p>
                                <p className="text-sm text-muted-foreground">{processName}</p>
                            </div>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 pt-0">
                        <div className="flex justify-end -mt-2 mb-2">
                             <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" disabled={!isAdmin}>
                                            <MoreVertical className="h-5 w-5"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={onDuplicate} disabled={!isAdmin}>
                                            <CopyPlus className="mr-2 h-4 w-4" />
                                            <span>Duplicate</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive px-2 py-1.5 h-auto text-sm" disabled={!isAdmin}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the process step <strong>{processNumber}</strong> and all its characteristics.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => removeProcessStep(processStepIndex)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                  control={form.control}
                                  name={`processSteps.${processStepIndex}.processNumber`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Process Number</FormLabel>
                                          <FormControl><Input placeholder="e.g., OP-10" {...field} disabled={!isAdmin}/></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name={`processSteps.${processStepIndex}.processName`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>ProcessName (Optional)</FormLabel>
                                          <FormControl><Input placeholder="e.g., Gear Cutting" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                          <FormField
                              control={form.control}
                              name={`processSteps.${processStepIndex}.processDescription`}
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Process Description (Optional)</FormLabel>
                                      <FormControl><Input placeholder="Describe the process step in more detail..." {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                  control={form.control}
                                  name={`processSteps.${processStepIndex}.machineDevice`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Machine / Device (Optional)</FormLabel>
                                          <FormControl><Input placeholder="e.g., Hobbing Machine HM-12" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name={`processSteps.${processStepIndex}.remark`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Remark (Optional)</FormLabel>
                                          <FormControl><Textarea placeholder="e.g., Certified Operator" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                          <ImageUploader 
                            form={form}
                            fieldName={`processSteps.${processStepIndex}.imageUrl`}
                            entityName="ProcessStep"
                            entityId={processStepId}
                            planNumber={planNumber}
                            onImageClick={onImageClick}
                           />
                        </div>
                         <Separator className="my-6" />

                        <div className="flex justify-between items-center mb-4">
                             <h5 className="font-semibold text-xl">Characteristics</h5>
                             <div className="flex gap-2">
                                <Button type="button" variant="outline" size="xs" onClick={() => setOpenCharAccordions(allCharAccordionItems)}>
                                    Expand All
                                </Button>
                                <Button type="button" variant="outline" size="xs" onClick={()=> setOpenCharAccordions([])}>
                                    Collapse All
                                </Button>
                            </div>
                        </div>
                        <Accordion type="multiple" className="w-full space-y-2" value={openCharAccordions} onValueChange={setOpenCharAccordions}>
                            {fields.map((field, characteristicIndex) => (
                                <CharacteristicAccordion 
                                    key={field.id}
                                    form={form}
                                    processStepIndex={processStepIndex}
                                    characteristicIndex={characteristicIndex}
                                    controlPlanId={controlPlanId}
                                    planNumber={planNumber}
                                    onImageClick={onImageClick}
                                    onDuplicate={() => {
                                        const charToDuplicate = form.getValues(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}`);
                                        const duplicatedChar = {
                                            ...charToDuplicate,
                                            id: generateTempId('char'),
                                            itemNumber: `${charToDuplicate.itemNumber}-COPY`
                                        };
                                        insertCharacteristic(characteristicIndex + 1, duplicatedChar);
                                    }}
                                />
                            ))}
                        </Accordion>
                         <FormMessage>{form.formState.errors.processSteps?.[processStepIndex]?.characteristics?.message}</FormMessage>

                        <Button type="button" variant="outline" size="sm" onClick={() => append(getDefaultCharacteristic(String(fields.length + 1)))} className="mt-2" disabled={!isAdmin}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Characteristic
                        </Button>
                    </div>
                </AccordionContent>
            </Card>
        </AccordionItem>
    );
};

const CharacteristicAccordion = ({ form, processStepIndex, characteristicIndex, controlPlanId, planNumber, onImageClick, onDuplicate }: { form: any, processStepIndex: number, characteristicIndex: number, controlPlanId?: string, planNumber?: string, onImageClick: (url: string, alt: string) => void, onDuplicate: () => void }) => {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin');
    
    const characteristicId = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.id`);
    const itemNumber = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.itemNumber`);
    const description = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.DesciptionSpec`);
    const charType = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.charType`);
    const nominal = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.nominal`);
    const lsl = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.lsl`);
    const usl = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.usl`);
    const units = form.watch(`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.units`);

    const formatSpec = () => {
        let spec = '';
        if (nominal && lsl && usl) {
            spec = `${nominal} (${lsl} - ${usl})`;
        } else if (nominal && (lsl || usl)) {
            spec = `${nominal} (${lsl ? `> ${lsl}` : ''}${usl ? `< ${usl}` : ''})`;
        } else if (lsl && usl) {
            spec = `${lsl} - ${usl}`;
        } else if (nominal) {
            spec = String(nominal);
        } else if (lsl) {
            spec = `> ${lsl}`;
        } else if (usl) {
            spec = `< ${usl}`;
        } else {
            return '';
        }

        if(units) {
            spec += ` ${units}`;
        }
        return spec;
    };
    
    const { remove: removeCharacteristic } = useFieldArray({
        control: form.control,
        name: `processSteps.${processStepIndex}.characteristics`,
    });
    
    return (
        <AccordionItem value={`char-item-${characteristicIndex}`} className="border rounded-md bg-background overflow-hidden">
            <AccordionTrigger className="p-3 hover:bg-muted/50 group cursor-pointer text-left">
                 <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <div className='text-left overflow-hidden'>
                            <p className="font-semibold truncate">
                                <span className="font-bold">{itemNumber || 'New'}.</span>{' '}
                                <span className="text-muted-foreground">({charType})</span>{' '}
                                {description}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{formatSpec()}</p>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
             <AccordionContent>
                <div className="px-4 pb-4">
                 <div className="flex justify-end -mt-2 mb-2">
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" disabled={!isAdmin}>
                                    <MoreVertical className="h-5 w-5"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={onDuplicate} disabled={!isAdmin}>
                                <CopyPlus className="mr-2 h-4 w-4" />
                                <span>Duplicate</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} disabled={!isAdmin}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this characteristic.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeCharacteristic(characteristicIndex)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-start pt-2 border-t">
                {/* Row 1 */}
                <FormField
                    control={form.control}
                    name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.itemNumber`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Item #</FormLabel>
                            <FormControl><Input placeholder="1" {...field} className="w-24 font-bold" disabled={!isAdmin}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className='flex gap-4 items-center pt-8'>
                    <FormField
                        control={form.control}
                        name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.DesciptionSpec`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel>Description Spec (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Tooth Diameter" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.ctq`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-6">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={!isAdmin}
                                    />
                                </FormControl>
                                <FormLabel>CTQ</FormLabel>
                            </FormItem>
                        )}
                    />
                </div>
                
                {/* Row 2 */}
                 <div className="col-span-1 md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.product`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product (Opt.)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Gear" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.process`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Process (Opt.)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Cutting" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Row 3: Specs */}
                <div className="col-span-1 md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.nominal`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nominal (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 10.0"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.lsl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>LSL (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 9.95"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.usl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>USL (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 10.05"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.units`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Units (Opt.)</FormLabel>
                                    <FormControl><Input placeholder="e.g., mm" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                 {/* Row 4: Control Limits */}
                <div className="col-span-1 md:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.lcl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>LCL (Opt.)</FormLabel>
                                    <FormControl>
                                       <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 9.98"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.cl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CL (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 10.0"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.ucl`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>UCL (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 10.02"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.sUSL`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>sUSL (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g., 1.88"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>


                {/* Row 5: Method */}
                <div className="col-span-1 md:col-span-2">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.sampleSize`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sample Size (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="1"
                                            placeholder="e.g., 5"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.frequency`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Frequency (Opt.)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="1"
                                            placeholder="e.g., 60"
                                            {...field}
                                            value={field.value ?? ''}
                                            disabled={!isAdmin}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.gauge`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gauge (Opt.)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Caliper" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.charType`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Char Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdmin}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {(['A', 'L', 'P'] as CharType[]).map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                {/* Row 6 */}
                 <div className="col-span-1 md:col-span-2">
                     <FormField
                        control={form.control}
                        name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.controlMethod`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Control Method (Opt.)</FormLabel>
                                <FormControl><Input placeholder="e.g., SPC Chart, Visual Inspection" {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                {/* Row 7 */}
                <div className="col-span-1 md:col-span-2">
                     <FormField
                        control={form.control}
                        name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.reactionPlan`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reaction Plan (Opt.)</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Stop process, quarantine parts..." {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                 {/* Row 8 */}
                <div className="col-span-1 md:col-span-2">
                     <FormField
                        control={form.control}
                        name={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.Instruction`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Instruction (Opt.)</FormLabel>
                                <FormControl><Textarea placeholder="e.g., Detailed work instruction for operator..." {...field} value={field.value ?? ''} disabled={!isAdmin} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                {/* Image Management */}
                 <div className="col-span-1 md:col-span-2">
                    <ImageUploader 
                        form={form} 
                        fieldName={`processSteps.${processStepIndex}.characteristics.${characteristicIndex}.imageUrl`}
                        entityName="Characteristic"
                        entityId={characteristicId}
                        planNumber={planNumber}
                        onImageClick={onImageClick}
                    />
                </div>
            </div>
            </div>
            </AccordionContent>
        </AccordionItem>
    );
}

const ImageUploader = ({ form, fieldName, entityName, entityId, planNumber, onImageClick }: { form: any, fieldName: string, entityName: string, entityId?: string, planNumber?: string, onImageClick: (url: string, alt: string) => void }) => {
    const { roles } = useAuth();
    const isAdmin = roles.includes('admin');
    const imageUrl = form.watch(fieldName);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [uploadError, setUploadError] = React.useState<string | null>(null);
    const { toast } = useToast();
    const [justUploaded, setJustUploaded] = React.useState(false);


    const handleUpload = (file: File) => {
        // Use planNumber for new plans, fallback to entityId for existing ones
        const idForPath = planNumber || entityId;
        if (!idForPath) {
             setUploadError(`${entityName} hat keine gültige ID oder Plan-Nummer. Bitte zuerst den Control Plan speichern.`);
             return;
        }

        if (!file.type.startsWith('image/')) {
            setUploadError("Ungültiger Dateityp. Bitte nur Bilder hochladen.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("Die Datei ist größer als 10 MB. Bitte wählen Sie eine kleinere Datei.");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setJustUploaded(false);

        const storage = getAppStorage();
        if (!storage) {
            setUploadError("Storage nicht initialisiert.");
            setIsUploading(false);
            return;
        }

        const storageRef = ref(storage, `uploads/${entityName.toLowerCase()}s/${idForPath}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error('Upload Error:', error);
                setUploadError(error.message);
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                form.setValue(fieldName, downloadURL, { shouldDirty: true });
                setJustUploaded(true);
                setIsUploading(false);
            }
        );
    };

    const handleCopyUrl = () => {
      if (!imageUrl) return;
      navigator.clipboard.writeText(imageUrl);
      toast({ title: 'URL kopiert!', description: 'Die Bild-URL wurde in die Zwischenablage kopiert.' });
    }
    
    const isInvalidSrc = !imageUrl || !imageUrl.startsWith('http');
    const displayUrl = justUploaded ? imageUrl : generateThumbnailUrl(imageUrl);

    return (
        <Card className="mt-2 bg-background/50">
            <CardContent className="p-4 space-y-2">
                 <FormField
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem className="flex-grow m-0">
                            <FormControl>
                                <div className="flex items-center gap-2">
                                     <Button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        size="icon"
                                        disabled={isUploading || !isAdmin}
                                        title="Bild hochladen"
                                    >
                                        <UploadCloud className="h-4 w-4" />
                                    </Button>
                                     {!isInvalidSrc ? (
                                        <button
                                            type="button"
                                            onClick={() => onImageClick(imageUrl, `Bild für ${entityName}`)}
                                            className="relative h-10 w-10 flex-shrink-0"
                                        >
                                            <Image
                                                src={displayUrl}
                                                alt={`Thumbnail für ${entityName}`}
                                                fill
                                                className="rounded-sm object-cover"
                                            />
                                        </button>
                                     ) : (
                                        <div className="flex h-10 w-10 items-center justify-center bg-muted rounded-sm flex-shrink-0">
                                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                     )}
                                    <Input
                                        placeholder="https://... oder Bild hochladen"
                                        {...field}
                                        value={field.value ?? ''}
                                        disabled={isUploading || !isAdmin}
                                        className="rounded-r-none"
                                    />
                                    <Button type="button" onClick={handleCopyUrl} variant="outline" size="icon" disabled={isUploading || !imageUrl} className="rounded-l-none border-l-0" title="URL kopieren">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage className="mt-2" />
                        </FormItem>
                    )}
                />
                <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    disabled={isUploading || !isAdmin}
                />
                 {isUploading && <Progress value={uploadProgress} className="w-full" />}
                 {uploadError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Upload Fehler</AlertTitle>
                        <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};
