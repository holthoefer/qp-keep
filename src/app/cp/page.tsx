

'use client';

import * as React from 'react';
import type { ControlPlan, ControlPlanStatus, Characteristic, ProcessStep } from '@/types';
import {
  ChevronRight,
  FileDown,
  Filter,
  MoreHorizontal,
  PlusCircle,
  Search,
  ShieldCheck,
  User,
  Diamond,
  Copy,
  FileText,
  Pencil,
  Trash2,
  History,
  ArrowUpDown,
  Upload,
  MoreVertical,
  ImageIcon,
  Printer,
  Loader2,
  Settings,
  ArrowLeft,
  Target,
  ListChecks,
  Book,
  Shield,
  LayoutGrid,
  FolderKanban,
  BrainCircuit,
  LogOut,
  FileImage,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import { getControlPlans, deleteControlPlan as deletePlanFromDb } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { DashboardClient } from '@/components/cp/DashboardClient';
import Image from 'next/image';
import { ImageModal } from '@/components/cp/ImageModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth-context';
import { generateThumbnailUrl } from '@/lib/image-utils';
import { KeepKnowLogo } from '@/components/icons';


const statusVariant: Record<
  ControlPlanStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Approved: 'default',
  Active: 'default',
  'For Review': 'secondary',
  Draft: 'secondary',
  Inactive: 'outline',
  Rejected: 'destructive',
};

const ALL_STATUSES: ControlPlanStatus[] = ['Draft', 'For Review', 'Approved', 'Active', 'Inactive', 'Rejected'];

const generateControlPlanHtmlWithThumbnails = (plan: ControlPlan): string => {
  const formatDate = (dateString?: string | null, emptyText: string = '') => {
    if (!dateString) return emptyText;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return emptyText;
        return format(date, 'dd.MM.yyyy');
    } catch {
        return emptyText;
    }
  };
  
  const getStatusBadge = (status: ControlPlanStatus) => {
    const colors: Record<ControlPlanStatus, { bg: string, text: string }> = {
      Approved: { bg: '#2563eb', text: '#ffffff' },
      Active: { bg: '#2563eb', text: '#ffffff' },
      'For Review': { bg: '#64748b', text: '#ffffff' },
      Draft: { bg: '#e2e8f0', text: '#1e293b' },
      Inactive: { bg: '#f8fafc', text: '#475569' },
      Rejected: { bg: '#dc2626', text: '#ffffff' },
    };
    const style = colors[status] || colors['Draft'];
    return `<span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: bold; border-radius: 9999px; background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.bg === '#f8fafc' ? '#e2e8f0' : 'transparent'};">${status}</span>`;
  };
  
  const sortedSteps = [...(plan.processSteps || [])].sort((a, b) => {
    const numA = a.processNumber ? a.processNumber.match(/\d+/g)?.join('') : '';
    const numB = b.processNumber ? b.processNumber.match(/\d+/g)?.join('') : '';
    return (numA || '').localeCompare((numB || ''), undefined, { numeric: true });
  });

  const planThumbnailUrl = generateThumbnailUrl(plan.imageUrl);
  const headerHtml = `
    <div class="header-grid">
        <!-- Left Column: Image -->
        <div class="header-col-left">
            ${plan.imageUrl ? `
                <div class="image-container">
                    <img src="${planThumbnailUrl}" alt="Image for ${plan.partName}" style="max-height: 256px; width: auto; object-fit: contain;" />
                </div>
            ` : ''}
        </div>
        <!-- Center Column: Main Data -->
        <div class="header-col-center">
            <table class="header-table">
                <tr><td class="label">Plan Number:</td><td class="content" style="font-size: 1.5rem; font-weight: bold; color: #2563eb;">${plan.planNumber}</td></tr>
                <tr><td class="label">Status:</td><td class="content">${getStatusBadge(plan.status)}</td></tr>
                <tr><td class="label">Part Number:</td><td class="content">${plan.partNumber}</td></tr>
                <tr><td class="label">Part Name:</td><td class="content">${plan.partName}</td></tr>
                <tr><td class="label">Supplier/Plant:</td><td class="content">${plan.supplierPlant || ''}</td></tr>
                <tr><td class="label">Supplier Code:</td><td class="content">${plan.supplierCode || ''}</td></tr>
                <tr><td class="label">Key Contact/Phone:</td><td class="content">${plan.keyContact || ''}</td></tr>
                <tr><td class="label">Core Team:</td><td class="content">${plan.coreTeam || ''}</td></tr>
                <tr><td class="label">Date (Rev.):</td><td class="content">${formatDate(plan.revisionDate)}</td></tr>
                <tr><td class="label">Cust.Engineer.Appr:</td><td class="content">${formatDate(plan.customerEngineeringApprovalDate)}</td></tr>
                <tr><td class="label">Customer Approval:</td><td class="content">${formatDate(plan.customerQualityApprovalDate)}</td></tr>
                <tr><td class="label">Date (Orig.):</td><td class="content">${formatDate(plan.originalFirstDate)}</td></tr>
                <tr><td class="label">Other Approval:</td><td class="content">${formatDate(plan.otherApprovalDate)}</td></tr>
            </table>
        </div>
        <!-- Right Column: Descriptions -->
        <div class="header-col-right">
             <div>
                <div class="field-label" style="font-weight: normal;">Plan Description:</div>
                <div class="content">${plan.planDescription || ''}</div>
             </div>
             <div>
                <div class="field-label" style="font-weight: normal;">General Information:</div>
                <div class="content">${plan.generalInformation || ''}</div>
             </div>
        </div>
    </div>
  `;
  
  const bodyHtml = sortedSteps.map(step => {
    const productProcessInfo = (char: Characteristic) => {
        const parts = [char.product, char.process].filter(Boolean);
        if (parts.length === 0) return '';
        if (parts.length === 2) return parts.join(' / ');
        return parts[0];
    };
    
    const stepThumbnailUrl = generateThumbnailUrl(step.imageUrl);
    return `
    <div key="${step.id}" class="no-break-inside" style="margin-bottom: 24px;">
        <h3 class="text-base font-bold bg-gray-100 p-2 border border-black" style="margin-bottom: 0;">
            ${step.processNumber} - ${step.processName || ''}
        </h3>
        <table class="print-table w-full process-step-table" style="margin-top: 0; margin-bottom: 0; border-top: 1px solid black;">
             <tbody>
                <tr>
                    <td class="image-cell" style="width: 140px; text-align: left; padding: 2px;">
                        ${step.imageUrl ? `
                            <div class="image-container">
                                <img src="${stepThumbnailUrl}" alt="Image for ${step.processName}" style="max-width: 128px; max-height: 128px; object-fit: contain;" />
                            </div>
                        ` : ''}
                    </td>
                    <td style="vertical-align: top; padding: 2px;">
                        <div class="field-label">Machine, Device, Jig, Tooling</div>
                        <div class="field-content">${step.machineDevice || ''}</div>
                    </td>
                    <td style="vertical-align: top; padding: 2px;">
                        <div class="field-label">Process Description</div>
                        <div class="field-content">${step.processDescription || ''}</div>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="print-table w-full char-table">
            <thead class="bg-gray-200">
                 <tr>
                    <th style="width: 120px;">Image</th>
                    <th style="width: 5%;">No.(Typ)</th>
                    <th>Characteristic / Product, Process</th>
                    <th>Specification</th>
                    <th>Gauge</th>
                    <th style="width: 5%;">Sample</th>
                    <th style="width: 5%;">Freq.</th>
                    <th>Control Method</th>
                    <th>Reaction Plan</th>
                 </tr>
            </thead>
            <tbody>
                ${(step.characteristics || []).sort((a,b) => a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true })).map(char => {
                    const charThumbnailUrl = generateThumbnailUrl(char.imageUrl);
                    return `
                    <tr key="${char.id}">
                        <td style="width: 120px; text-align: center; padding: 2px;">
                            ${char.imageUrl ? `
                                <div class="image-container">
                                    <img src="${charThumbnailUrl}" alt="Image for ${char.DesciptionSpec}" style="max-width: 96px; max-height: 96px; object-fit: contain;" />
                                </div>
                            ` : ''}
                        </td>
                        <td>${char.itemNumber} (${char.charType}) ${char.ctq ? '*' : ''}</td>
                        <td>
                            <div>${char.DesciptionSpec || ''}</div>
                            <div style="font-size: 14px; color: #555;">${productProcessInfo(char)}</div>
                        </td>
                        <td>${char.nominal || ''}${char.units || ''} (${char.lsl || ''}-${char.usl || ''})</td>
                        <td>${char.gauge || ''}</td>
                        <td>${char.sampleSize || ''}</td>
                        <td>${char.frequency || ''}</td>
                        <td>${char.controlMethod || ''}</td>
                        <td>${char.reactionPlan || ''}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    </div>
  `}).join('');

  return `
    <html>
      <head>
        <title>Prüfplan ${plan.planNumber}</title>
        <style>
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; font-family: sans-serif; font-size: 14px; }
          .print-table { border-collapse: collapse; width: 100%; font-size: 14px; }
          .print-table td, .print-table th { border: 1px solid black; padding: 4px; vertical-align: top; }
          .header-table { border-collapse: collapse; width: 100%; font-size: 14px; }
          .header-table td { padding: 0 4px; vertical-align: top; }
          .header-table .label { font-weight: normal; text-align: left; padding-right: 0.5em; padding-bottom: 0; margin-bottom: 0; line-height: 1.1; }
          .header-table .content, .content { font-weight: bold; font-size: 14px; word-break: break-word; padding-top: 0; margin-top: 0; line-height: 1.1; }
          .char-table { margin-bottom: 0; }
          .no-break-inside { page-break-inside: avoid; }
          .field-label { font-size: 10px; font-weight: normal; }
          .field-content { font-size: 14px; font-weight: bold; }
          .print-button-container { position: absolute; top: 1rem; right: 1rem; }
          .print-button { padding: 8px 16px; border: none; background-color: #2563eb; color: white; border-radius: 4px; cursor: pointer; font-size: 14px; }
          .header-grid { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
          .header-col-left { flex-shrink: 0; width: 25%; }
          .header-col-center { flex-grow: 1; min-width: 350px; }
          .header-col-right { flex-grow: 1; flex-basis: 200px; display: flex; flex-direction: column; gap: 1rem; }
          .image-url { font-size: 8px; color: #888; word-break: break-all; margin-top: 4px; }
          .image-container { display: flex; flex-direction: column; align-items: center; text-align: center; }
          @media print { .no-print { display: none !important; } }
          @media (max-width: 768px) {
            .header-grid { flex-direction: column; }
            .header-col-right { order: 3; }
            .header-col-center { order: 2; }
            .header-col-left { order: 1; width: 100%; }
          }
        </style>
      </head>
      <body class="p-4">
        <div class="print-button-container no-print">
            <button class="print-button" onclick="window.print()">Drucken</button>
        </div>
        <div class="flex justify-between items-start mb-4">
            <h1 class="text-4xl font-bold" style="font-size: 2.5rem;">Prüfplan 💠 Projekt-Lenkungsplan</h1>
        </div>
        <div class="space-y-4">
          ${headerHtml}
          ${bodyHtml}
        </div>
      </body>
    </html>
  `;
};

const generateControlPlanHtmlWithoutImages = (plan: ControlPlan): string => {
  const formatDate = (dateString?: string | null, emptyText: string = '') => {
    if (!dateString) return emptyText;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return emptyText;
        return format(date, 'dd.MM.yyyy');
    } catch {
        return emptyText;
    }
  };
  
  const getStatusBadge = (status: ControlPlanStatus) => {
    const colors: Record<ControlPlanStatus, { bg: string, text: string }> = {
      Approved: { bg: '#2563eb', text: '#ffffff' },
      Active: { bg: '#2563eb', text: '#ffffff' },
      'For Review': { bg: '#64748b', text: '#ffffff' },
      Draft: { bg: '#e2e8f0', text: '#1e293b' },
      Inactive: { bg: '#f8fafc', text: '#475569' },
      Rejected: { bg: '#dc2626', text: '#ffffff' },
    };
    const style = colors[status] || colors['Draft'];
    return `<span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: bold; border-radius: 9999px; background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.bg === '#f8fafc' ? '#e2e8f0' : 'transparent'};">${status}</span>`;
  };

  const formatSpec = (char: Characteristic) => {
    let spec = '';
    if (char.nominal !== undefined && char.lsl !== undefined && char.usl !== undefined) {
      spec = `${char.nominal} (${char.lsl} - ${char.usl})`;
    } else if (char.nominal !== undefined) {
      spec = String(char.nominal);
    } else if (char.lsl !== undefined && char.usl !== undefined) {
      spec = `${char.lsl} - ${char.usl}`;
    } else if (char.lsl !== undefined) {
      spec = `> ${char.lsl}`;
    } else if (char.usl !== undefined) {
      spec = `< ${char.usl}`;
    }
    if (char.units) spec += ` ${char.units}`;
    return spec || char.DesciptionSpec || '';
  };
  
  const sortedSteps = [...(plan.processSteps || [])].sort((a, b) => {
    const numA = a.processNumber ? a.processNumber.match(/\d+/g)?.join('') : '';
    const numB = b.processNumber ? b.processNumber.match(/\d+/g)?.join('') : '';
    return (numA || '').localeCompare((numB || ''), undefined, { numeric: true });
  });

  const TdHeader = (label: string) => `<div class="text-xxs font-normal text-gray-500">${label}</div>`;
  const TdContent = (content?: string | number | null) => `<div class="text-sm font-bold text-black">${content || '&nbsp;'}</div>`;
  const TdBlueContent = (content?: string | number) => `<div class="text-lg" style="color: #2563eb; font-weight: bold;">${content || '&nbsp;'}</div>`;

  const headerHtml = `
    <div class="border border-black">
      <div style="display: grid; grid-template-columns: repeat(5, 1fr);" class="border-b border-black">
        <div class="grid-cell">${TdHeader('Control Plan Number')}${TdBlueContent(plan.planNumber)}</div>
        <div class="grid-cell">${TdHeader('Part Name')}${TdContent(plan.partName)}</div>
        <div class="grid-cell">${TdHeader('Key Contact/Phone')}${TdContent(plan.keyContact)}</div>
        <div class="grid-cell">${TdHeader('Customer Quality Approval')}${TdContent(formatDate(plan.customerQualityApprovalDate, "Date (If Req'd)"))}</div>
        <div class="grid-cell">${TdHeader('Original First Date')}${TdContent(formatDate(plan.originalFirstDate))}</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr);" class="border-b border-black">
        <div class="grid-cell">${TdHeader('Part Number/Latest Change')}${TdContent(`${plan.partNumber} / v${plan.version}`)}</div>
        <div class="grid-cell">${TdHeader('Core Team')}${TdContent(plan.coreTeam)}</div>
        <div class="grid-cell">${TdHeader('Plant Approval')}${TdContent(formatDate(plan.plantApprovalDate))}</div>
        <div class="grid-cell">${TdHeader('Customer Eng. Approval')}${TdContent(formatDate(plan.customerEngineeringApprovalDate, "Date (If Req'd)"))}</div>
        <div class="grid-cell">${TdHeader('Date (Rev.)')}${TdContent(formatDate(plan.revisionDate))}</div>
      </div>
       <div style="display: grid; grid-template-columns: repeat(5, 1fr);">
        <div class="grid-cell">${TdHeader('Supplier/Plant')}${TdContent(plan.supplierPlant)}</div>
        <div class="grid-cell">${TdHeader('Supplier Code')}${TdContent(plan.supplierCode)}</div>
        <div class="grid-cell">${TdHeader('Other Approval Text')}${TdContent(plan.otherApproval)}</div>
        <div class="grid-cell">${TdHeader('Other Approval Date')}${TdContent(formatDate(plan.otherApprovalDate))}</div>
        <div class="grid-cell">${TdHeader('Status')}${getStatusBadge(plan.status)}</div>
      </div>
    </div>
    <div style="height: 1rem;"></div>
    <div style="display: grid; grid-template-columns: 1fr 1fr;">
        <div class="grid-cell no-border no-padding-left">${TdHeader('Plan Description')}${TdContent(plan.planDescription)}</div>
        <div class="grid-cell no-border">${TdHeader('General Information')}${TdContent(plan.generalInformation)}</div>
    </div>
  `;

  const bodyRows = sortedSteps.map(step => {
    const stepChars = (step.characteristics || []).sort((a,b) => a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true }));
    const rowSpan = Math.max(1, stepChars.length);
    if (stepChars.length > 0) {
      return stepChars.map((char, charIndex) => {
        let productProcessInfo = '';
        if (char.product && char.process) {
            productProcessInfo = `${char.product} / ${char.process}`;
        } else if (char.product) {
            productProcessInfo = char.product;
        } else if (char.process) {
            productProcessInfo = char.process;
        }
        
        return `
        <tr key="${step.id}-${char.id}">
          ${charIndex === 0 ? `
            <td rowspan="${rowSpan}">${step.processNumber}</td>
            <td rowspan="${rowSpan}">${step.processName || ''} <div class="text-xs text-gray-600">${step.processDescription || ''}</div></td>
            <td rowspan="${rowSpan}">${step.machineDevice || ''}</td>
          ` : ''}
          <td>${char.itemNumber} (${char.charType})</td>
          <td>
            <div style="font-size: 14px;">${char.DesciptionSpec || ''}</div>
            <div style="font-size: 14px; color: #555;">${productProcessInfo}</div>
          </td>
          <td>${char.ctq ? `Y` : 'N'}</td>
          <td>${formatSpec(char)}</td>
          <td>${char.gauge || ''}</td>
          <td>${char.sampleSize || ''}</td>
          <td>${char.frequency || ''}</td>
          <td>${char.controlMethod || ''}</td>
          <td>${char.reactionPlan || ''}</td>
        </tr>
      `}).join('');
    }
    return `
      <tr key="${step.id}">
        <td>${step.processNumber}</td>
        <td>${step.processName || ''} <div class="text-xs text-gray-600">${step.processDescription || ''}</div></td>
        <td>${step.machineDevice || ''}</td>
        <td colspan="9" class="text-center italic text-gray-500">No characteristics defined.</td>
      </tr>
    `;
  }).join('');

  const bodyHtml = `
    <div style="border: 1px solid black;">
      <table class="print-table">
        <thead class="bg-gray-200 font-bold">
          <tr>
            <th class="w-[4%]">Process#</th>
            <th class="w-[8%]">PROCESS NAME/OPERATION DESCRIPTION</th>
            <th class="w-[8%]">MACHINE, DEVICE, JIG, OR TOOLING FOR MFG.</th>
            <th class="w-[4%]">No.(Typ)</th>
            <th class="w-[22%]">Characteristic / Product, Process</th>
            <th class="w-[3%]">CTQ</th>
            <th class="w-[12%]">PRODUCT/PROCESS SPECIFICATION/TOLERANCE</th>
            <th class="w-[7%]">EVALUATION/MEASUREMENT TECHNIQUE</th>
            <th class="w-[4%]">Size</th>
            <th class="w-[5%]">FREQ.</th>
            <th class="w-[11%]">CONTROL METHOD</th>
            <th class="w-[12%]">REACTION PLAN</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
  
  return `
    <html>
      <head>
        <title>Control Plan ${plan.planNumber}</title>
        <style>
          body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table td, .print-table th { border: 1px solid black; padding: 2px; vertical-align: top; text-align: left; font-size: 14px; }
          .print-table th { text-align: center; font-size: 10px; }
          .grid-cell { padding: 4px; border-right: 1px solid black; }
          .grid-cell:last-child { border-right: none; }
          .no-border { border: none; padding: 4px; }
          .no-padding-left { padding-left: 0; }
          .text-xxs { font-size: 0.65rem; line-height: 0.9rem; }
          .print-button-container { position: absolute; top: 1rem; right: 1rem; }
          .print-button { padding: 8px 16px; border: none; background-color: #2563eb; color: white; border-radius: 4px; cursor: pointer; font-size: 14px; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
         <div class="print-button-container no-print">
            <button class="print-button" onclick="window.print()">Drucken</button>
        </div>
        <div class="space-y-4">
          <div class="text-center my-4">
              <h1 class="font-bold text-4xl" style="font-size: 2.5rem;">Control Plan 💠 Lenkungsplan</h1>
          </div>
          <div style="height: 1rem;"></div>
          <div class="my-4">
            ${headerHtml}
          </div>
          <div style="height: 1rem;"></div>
          <div class="my-4">
            ${bodyHtml}
          </div>
        </div>
      </body>
    </html>
  `;
};

function ControlPlanRow({
  plan,
  isAdmin,
  onEdit,
  onDelete,
  onDuplicate,
  onHistory,
  onImageClick,
  onPrintV1,
  onPrintV2,
  onExportCsv,
}: {
  plan: ControlPlan;
  isAdmin: boolean;
  onEdit: (plan: ControlPlan) => void;
  onDelete: (planId: string) => void;
  onDuplicate: (plan: ControlPlan) => void;
  onHistory: (plan: ControlPlan) => void;
  onImageClick: (url: string, alt: string) => void;
  onPrintV1: (plan: ControlPlan) => void;
  onPrintV2: (plan: ControlPlan) => void;
  onExportCsv: (plan: ControlPlan) => void;
}) {

  const [thumbnailUrl, setThumbnailUrl] = React.useState(generateThumbnailUrl(plan.imageUrl));
  const [hasError, setHasError] = React.useState(false);

  const handleImageError = () => {
    // If the thumbnail fails, try the original URL
    if (plan.imageUrl && thumbnailUrl !== plan.imageUrl) {
        setThumbnailUrl(plan.imageUrl);
    } else {
        // If the original also fails (or there was no thumbnail), mark as error
        setHasError(true);
    }
  };


  return (
    <React.Fragment>
      <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(plan)}>
        <TableCell className="w-[68px]">
          <div className='flex items-center justify-start gap-0'>
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                   {isAdmin && (
                    <DropdownMenuItem onClick={() => onEdit(plan)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                   )}
                   {isAdmin && (
                    <DropdownMenuItem onClick={() => onDuplicate(plan)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                    </DropdownMenuItem>
                   )}
                  <DropdownMenuItem onClick={() => onHistory(plan)}>
                    <History className="mr-2 h-4 w-4" />
                    View History
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => onPrintV1(plan)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Druck Prüfplan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPrintV2(plan)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print CP
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onExportCsv(plan)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    CSV-Export
                  </DropdownMenuItem>
                  {isAdmin && <DropdownMenuSeparator />}
                  {isAdmin && (
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem className='text-destructive' onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

               <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the control plan for {plan.partName}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(plan.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
        <TableCell className="sticky left-0 bg-card/80 backdrop-blur-sm z-10 w-32">
          <div className="font-mono font-medium">{plan.planNumber}</div>
          <div className="text-xs text-muted-foreground">{plan.partNumber}</div>
        </TableCell>
        <TableCell>
            {plan.imageUrl ? (
                <div>
                  <button
                      onClick={(e) => { e.stopPropagation(); onImageClick(plan.imageUrl!, `Vollbildansicht für ${plan.planNumber}`); }}
                      className="disabled:cursor-not-allowed"
                      disabled={hasError}
                  >
                      <Image
                          src={hasError ? 'https://placehold.co/40x40/png?text=Error' : thumbnailUrl}
                          alt={`Thumbnail für ${plan.planNumber}`}
                          width={40}
                          height={40}
                          className="rounded object-cover aspect-square"
                          onError={handleImageError}
                      />
                  </button>
                </div>
            ) : null}
        </TableCell>
        <TableCell>
          <div className="font-medium">{plan.partName}</div>
        </TableCell>
        <TableCell>
          <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
        </TableCell>
        <TableCell>{plan.version}</TableCell>
        <TableCell>
          {plan.revisionDate ? format(new Date(plan.revisionDate), 'dd.MM.yyyy') : '-'}
        </TableCell>
        <TableCell className="text-right">
            {plan.keyContact}
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

const getExamplePlans = (): ControlPlan[] => [
    {
        id: 'example-1',
        planNumber: 'CP-EX-001',
        partNumber: 'PN-DEMO-A',
        partName: 'Beispiel-Getriebe',
        status: 'Active',
        version: 2,
        revisionDate: new Date().toISOString(),
        keyContact: 'Max Mustermann',
        processSteps: [],
    },
    {
        id: 'example-2',
        planNumber: 'CP-EX-002',
        partNumber: 'PN-DEMO-B',
        partName: 'Beispiel-Welle',
        status: 'Draft',
        version: 1,
        revisionDate: new Date().toISOString(),
        keyContact: 'Erika Musterfrau',
        processSteps: [],
    },
];

export default function ControlPlansPage() {
  const { user, roles, loading: authLoading, logout } = useAuth();
  const isAdmin = roles.includes('admin');
  const router = useRouter();
  const [plans, setPlans] = React.useState<ControlPlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilters, setStatusFilters] = React.useState<ControlPlanStatus[]>([]);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');
  const [historyPlan, setHistoryPlan] = React.useState<ControlPlan | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = React.useState(false);
  const [isExampleData, setIsExampleData] = React.useState(false);


  const fetchPlans = React.useCallback(async () => {
    setIsLoading(true);
    setIsExampleData(false);
    try {
      const plansFromDb = await getControlPlans();
      
      if (plansFromDb.length === 0) {
        setPlans(getExamplePlans());
        setIsExampleData(true);
      } else {
        setPlans(plansFromDb);
      }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Could not fetch control plans. This is expected if the collection doesn't exist or rules are new. Displaying example data.");
            setPlans(getExamplePlans());
            setIsExampleData(true);
        } else {
            console.error("Error fetching control plans:", error);
            toast({
                title: 'Error',
                description: 'Could not fetch control plans from the database.',
                variant: 'destructive',
            });
        }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if(!authLoading) {
      fetchPlans();
    }
  }, [fetchPlans, authLoading]);


  const filteredPlans = React.useMemo(() => {
    return plans
      .filter((plan) => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          plan.partName.toLowerCase().includes(searchLower) ||
          plan.planNumber.toLowerCase().includes(searchLower) ||
          plan.partNumber.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilters.length === 0 || statusFilters.includes(plan.status);

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) => {
            if (!a.planNumber) return 1;
            if (!b.planNumber) return -1;
            return a.planNumber.localeCompare(b.planNumber, undefined, { numeric: true, sensitivity: 'base' });
        }
      );
  }, [plans, search, statusFilters]);

  const handleOpenNew = () => {
    router.push('/cp/new');
  };

  const handleOpenEdit = (plan: ControlPlan) => {
     if (isExampleData) {
        toast({ title: 'Beispieldaten', description: 'Dies ist ein Beispieldatensatz. Bitte legen Sie einen neuen Plan an, um ihn zu bearbeiten.' });
        return;
    }
    router.push(`/cp/edit/${plan.id}`);
  };

  const handleImageClick = (url: string, alt: string) => {
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsModalOpen(true);
  };

   const handleOpenHistory = (plan: ControlPlan) => {
    setHistoryPlan(plan);
    setIsHistoryOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDuplicatePlan = (planToDuplicate: ControlPlan) => {
    const { id, ...planData } = planToDuplicate;

    const duplicatedPlan: Omit<ControlPlan, 'id'> & { id?: string } = {
        ...planData,
        id: undefined,
        planNumber: `${planData.planNumber}-COPY-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        status: 'Draft',
        version: 1,
        revisionDate: new Date().toISOString().split('T')[0],
        originalFirstDate: new Date().toISOString().split('T')[0],
        plantApprovalDate: '',
        customerEngineeringApprovalDate: '',
        customerQualityApprovalDate: '',
        otherApprovalDate: '',
    };
    
    // Store the duplicated plan in session storage and redirect
    sessionStorage.setItem('duplicatedPlan', JSON.stringify(duplicatedPlan));
    router.push('/cp/new');

    toast({
        title: 'Plan Duplicated',
        description: `A copy of "${planToDuplicate.partName}" is ready to be saved.`,
    });
  };

  const handleDeletePlan = async (planId: string) => {
    if (isExampleData) {
      toast({ title: 'Beispieldaten', description: 'Beispieldaten können nicht gelöscht werden.' });
      return;
    }
    try {
        await deletePlanFromDb(planId);
        await fetchPlans();
        toast({
            title: 'Control Plan Deleted',
            description: 'The control plan has been successfully deleted.',
        });
    } catch (error) {
        console.error("Error deleting plan:", error);
        toast({
            title: 'Error',
            description: 'Failed to delete the control plan.',
            variant: 'destructive',
        });
    }
  };

  const handleStatusFilterChange = (status: ControlPlanStatus) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const handlePrintV1 = (plan: ControlPlan) => {
    const htmlContent = generateControlPlanHtmlWithThumbnails(plan);
    const docWindow = window.open('about:blank', '_blank');
    if (docWindow) {
        docWindow.document.open();
        docWindow.document.write(htmlContent);
        docWindow.document.close();
    } else {
        toast({
            title: "Could not open new window",
            description: "Please disable your pop-up blocker.",
            variant: "destructive"
        });
    }
  };

  const handlePrintV2 = (plan: ControlPlan) => {
    const htmlContent = generateControlPlanHtmlWithoutImages(plan);
    const docWindow = window.open('about:blank', '_blank');
    if (docWindow) {
        docWindow.document.open();
        docWindow.document.write(htmlContent);
        docWindow.document.close();
    } else {
        toast({
            title: "Could not open new window",
            description: "Please disable your pop-up blocker.",
            variant: "destructive"
        });
    }
  }

  const handleExportCsv = (plan: ControlPlan) => {
    try {
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

        const rows = (plan.processSteps || []).flatMap(step => 
            (step.characteristics || []).map(char => {
                const planData = planHeaderKeys.map(key => escapeCsvField(plan[key as keyof typeof plan]));
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Control Plan
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                Notizen
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                WP
            </Button>
             <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                DNA
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/PO')}>
                <FolderKanban className="mr-2 h-4 w-4" />
                PO
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                <Book className="mr-2 h-4 w-4" />
                LP
            </Button>
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => router.push('/storage')}>
                  <FileImage className="mr-2 h-4 w-4" />
                  Storage
                </Button>
            )}
            {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || ''} />
                    <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Ausloggen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <DashboardClient>
          <ImageModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            imageUrl={modalImageUrl}
            imageAlt={modalImageAlt}
          />
          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Version History for {historyPlan?.planNumber}</DialogTitle>
                      <DialogDescription>
                          Overview of the plan's versioning information.
                      </DialogDescription>
                  </DialogHeader>
                  {historyPlan && (
                    <div className="space-y-4 text-sm py-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Version:</span>
                            <span className="font-medium">{historyPlan.version}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Revision Date:</span>
                            <span className="font-medium">{historyPlan.revisionDate ? format(new Date(historyPlan.revisionDate), 'PPP') : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Original Creation Date:</span>
                            <span className="font-medium">{historyPlan.originalFirstDate ? format(new Date(historyPlan.originalFirstDate), 'PPP') : 'N/A'}</span>
                        </div>
                    </div>
                  )}
              </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                      <CardTitle className="text-xl">Control Plan Overview</CardTitle>
                      <CardDescription>
                        Manage and track all quality control plans.
                      </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                              <Filter className="h-3.5 w-3.5" />
                              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                  Filter
                              </span>
                              {statusFilters.length > 0 && <Badge variant="secondary" className="ml-2">{statusFilters.length}</Badge>}
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ALL_STATUSES.map(status => (
                                  <DropdownMenuCheckboxItem
                                      key={status}
                                      checked={statusFilters.includes(status)}
                                      onSelect={e => e.preventDefault()}
                                      onCheckedChange={() => handleStatusFilterChange(status)}
                                  >
                                      {status}
                                  </DropdownMenuCheckboxItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="outline" size="sm" onClick={handleOpenNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Neuer Control Plan
                      </Button>
                  </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search plans by name, part or plan number..."
                  className="pl-8 w-full md:w-1/3"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[68px]">Actions</TableHead>
                    <TableHead className="sticky left-0 bg-card/80 backdrop-blur-sm z-10 w-32">Plan Number</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Revision</TableHead>
                    <TableHead className="text-right">Key Contact</TableHead>
                  </TableRow>
                </TableHeader>
                {isLoading ? (
                  <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                              <TableCell className="w-[68px]"><Skeleton className="h-8 w-24" /></TableCell>
                              <TableCell className="sticky left-0 bg-card/80 backdrop-blur-sm z-10 w-32"><Skeleton className="h-6 w-full" /></TableCell>
                              <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
                ) : (
                  <TableBody>
                      {filteredPlans.length > 0 ? (
                        filteredPlans.map((plan) => (
                        <ControlPlanRow
                            key={plan.id}
                            plan={plan}
                            isAdmin={isAdmin}
                            onEdit={() => handleOpenEdit(plan)}
                            onDelete={handleDeletePlan}
                            onDuplicate={handleDuplicatePlan}
                            onHistory={handleOpenHistory}
                            onImageClick={handleImageClick}
                            onPrintV1={handlePrintV1}
                            onPrintV2={handlePrintV2}
                            onExportCsv={handleExportCsv}
                        />
                        ))
                      ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No control plans found.
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                )}
              </Table>
              </div>
            </CardContent>
          </Card>
        </DashboardClient>
      </main>
    </div>
  );
}
