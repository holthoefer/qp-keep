
import { Timestamp } from 'firebase/firestore';

export enum ControlPlanStatus {
  Draft = 'Draft',
  ForReview = 'For Review',
  Approved = 'Approved',
  Active = 'Active',
  Inactive = 'Inactive',
  Rejected = 'Rejected',
}
export type CharType = 'P' | 'L' | 'A';

export interface Characteristic {
  id: string;
  itemNumber: string;
  DesciptionSpec?: string;
  ctq?: boolean;
  product?: string;
  process?: string;
  nominal?: number;
  lsl?: number;
  usl?: number;
  lcl?: number;
  cl?: number;
  ucl?: number;
  sUSL?: number;
  units?: string;
  gauge?: string;
  sampleSize?: number;
  frequency?: number;
  charType: CharType;
  controlMethod?: string;
  reactionPlan?: string;
  Instruction?: string;
  imageUrl?: string;
}

export interface ProcessStep {
  id:string;
  processNumber: string;
  processName?: string;
  processDescription?: string;
  machineDevice?: string;
  remark?: string;
  characteristics: Characteristic[];
  imageUrl?: string;
}

export interface ControlPlan {
  id: string;
  planNumber: string;
  partNumber: string;
  partName: string;
  planDescription?: string;
  revisionDate: string;
  status: ControlPlanStatus;
  version: number;
  processSteps: ProcessStep[];
  supplierPlant?: string;
  supplierCode?: string;
  keyContact?: string;
  coreTeam?: string;
  plantApprovalDate?: string;
  otherApproval?: string;
  originalFirstDate?: string;
  customerEngineeringApprovalDate?: string;
  customerQualityApprovalDate?: string;
  otherApprovalDate?: string;
  generalInformation?: string;
  imageUrl?: string;
  lastChangedBy?: string;
  createdAt?: string;
}

export interface Workstation {
  AP: string;
  Beschreibung?: string;
  POcurrent?: string;
  CPcurrent?: string;
  OPcurrent?: string;
  Bemerkung?: string;
  LOTcurrent?: string;
  imageUrl?: string;
}

export interface Auftrag {
  PO: string;
  CP?: string;
  Anmerkung?: string;
  imageUrl?: string;
}

export interface SampleData {
  workstationId: string;
  characteristicId: string;
  po: string;
  lot: string;
  mean: number;
  stddev: number;
  timestamp: string;
  values: number[];
  dnaId: string;
  note?: string;
  imageUrl?: string;
  exception?: boolean;
}

export interface DNA {
  idDNA: string;
  idChar?: string;
  idPs?: string;
  CP: string;
  OP: string;
  Char: string;
  WP: string;
  PO: string;
  LSL?: number;
  LCL?: number;
  CL?: number;
  UCL?: number;
  USL?: number;
  sUSL?: number;
  SampleSize?: number;
  Frequency?: number;
  Memo?: string;
  imageUrl?: string;
  imageUrlLatestSample?: string;
  checkStatus?: string;
  lastCheckTimestamp?: string;
}

export interface Note {
    id: string;
    userId: string;
    userEmail: string;
    title: string;
    content: string;
    tags?: string[];
    createdAt: Timestamp;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    role: 'user' | 'admin';
    status: 'active' | 'inactive';
    createdAt: Timestamp;
    roles?: string[];
}


export interface ControlPlanItem {
    id: string;
    planNumber: string;
    partNumber: string;
    partName: string;
    version: number;
    status: ControlPlanStatus;
    createdAt: Timestamp;
    revisionDate?: string;
    planDescription?: string;
    keyContact?: string;
    supplierPlant?: string;
    supplierCode?: string;
    coreTeam?: string;
    plantApprovalDate?: string;
    otherApproval?: string;
    originalFirstDate?: string;
    customerEngineeringApprovalDate?: string;
    customerQualityApprovalDate?: string;
    otherApprovalDate?: string;
    generalInformation?: string;
    imageUrl?: string;
}


export interface StorageFile {
  url: string;
  name: string;
  thumbnailUrl?: string;
}
