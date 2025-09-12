

'use client';

import { db, auth, getAppStorage as getFirebaseStorage } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc,
  setDoc,
  Timestamp,
  orderBy,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { ref, listAll, getDownloadURL, type StorageReference } from "firebase/storage";
import { suggestTags } from '@/ai/flows/suggest-tags';
import type { User } from 'firebase/auth';
import type { ControlPlan, ControlPlanItem, Note, UserProfile, StorageFile, Workstation, Auftrag, DNA, SampleData, ProcessStep, Characteristic, Incident, Event } from '@/types';


export const getAppStorage = getFirebaseStorage;
export { auth };

// Note Management
export const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'userEmail'> & { userEmail: string, attachmentUrl?: string }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Nicht authentifiziert.");
    
    const userProfile = await getProfile(user);
    if (userProfile?.status !== 'active' && userProfile?.status !== 'note') {
        throw new Error('Ihr Konto ist inaktiv. Sie können keine neuen Notizen erstellen.');
    }
    
    let tags: string[] = [];
    try {
        const result = await suggestTags({ noteContent: `${note.title}\n${note.content}` });
        tags = result.tags || [];
    } catch (error) {
        console.error("Error generating tags, saving note without them.", error);
    }

    const dataToSave: any = {
        ...note,
        tags: tags,
        createdAt: serverTimestamp(),
    };

    if (!note.attachmentUrl) {
        delete dataToSave.attachmentUrl;
    }

    await addDoc(collection(db, 'notes'), dataToSave);
};

export const getNotes = (
  userId: string,
  isAdmin: boolean,
  onSuccess: (notes: Note[]) => void,
  onError: (error: Error) => void,
) => {
  let q;
  if (isAdmin) {
    // Admin query can sort directly as it doesn't have a 'where' clause on a different field.
    q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
  } else {
    // For regular users, filter by userId. Sorting will be done on the client.
    q = query(collection(db, 'notes'), where('userId', '==', userId));
  }
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const notes: Note[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      // Sort on the client side to avoid needing a composite index.
      notes.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });
      onSuccess(notes);
    }, 
    (error) => {
      console.error("Firestore getNotes error: ", error);
      onError(error);
    }
  );
};

export const deleteNote = async (noteId: string) => {
    await deleteDoc(doc(db, 'notes', noteId));
}

// User Profile Management
export const getProfile = async (user: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            console.log(`Profile for ${user.uid} not found, creating it...`);
            const newUserProfile: Omit<UserProfile, 'createdAt'> = {
                uid: user.uid,
                email: user.email!,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user', // Default role
                status: 'note', // Default status for new users
            };
            await setDoc(userDocRef, {
                ...newUserProfile,
                createdAt: serverTimestamp()
            });
            // Return the newly created profile data, creating a client-side timestamp
            return { ...newUserProfile, createdAt: new Timestamp(Date.now() / 1000, 0) };
        }
        return { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
    } catch (error) {
        console.error("Error fetching profile for", user.uid, error);
        return null;
    }
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
    const querySnapshot = await getDocs(query(collection(db, 'users')));
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
};

export const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    await updateDoc(doc(db, 'users', userId), data);
};


// Old Control Plan (Simple)
export const getControlPlanItems = (
    onSuccess: (items: ControlPlanItem[]) => void,
    onError: (error: Error) => void
) => {
    const q = query(collection(db, 'controlplan'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items: ControlPlanItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ControlPlanItem));
        onSuccess(items);
    }, onError);
};

export const addControlPlanItem = async (item: Omit<ControlPlanItem, 'id' | 'createdAt'>) => {
    if (!item.planNumber) {
        throw new Error("Plan Number ist ein Pflichtfeld.");
    }
    const docRef = doc(db, 'controlplan', item.planNumber);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        throw new Error(`Ein Control Plan mit der Nummer ${item.planNumber} existiert bereits.`);
    }
    
    // The new ID is the planNumber
    const newItem: ControlPlanItem = {
        ...item,
        id: item.planNumber,
        createdAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(docRef, newItem);
};

export const updateControlPlanItem = async (id: string, data: Partial<Omit<ControlPlanItem, 'id' | 'createdAt' | 'planNumber'>>) => {
    // The document ID is the planNumber and should not be changed.
    await updateDoc(doc(db, 'controlplan', id), data);
};

export const deleteControlPlanItem = async (id: string) => {
    await deleteDoc(doc(db, 'controlplan', id));
};


// Lenkungsplan
export const getLenkungsplanItems = (
    onSuccess: (items: ControlPlanItem[]) => void,
    onError: (error: Error) => void
) => {
    const q = query(collection(db, 'lenkungsplan'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items: ControlPlanItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ControlPlanItem));
        onSuccess(items);
    }, onError);
};

export const addLenkungsplanItem = async (item: Omit<ControlPlanItem, 'id' | 'createdAt'>) => {
    if (!item.planNumber) {
        throw new Error("Plan Number ist ein Pflichtfeld.");
    }
    const docRef = doc(db, 'lenkungsplan', item.planNumber);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        throw new Error(`Ein Lenkungsplan mit der Nummer ${item.planNumber} existiert bereits.`);
    }
    
    const newItem: ControlPlanItem = {
        ...item,
        id: item.planNumber,
        createdAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(docRef, newItem);
};

export const updateLenkungsplanItem = async (id: string, data: Partial<Omit<ControlPlanItem, 'id' | 'createdAt' | 'planNumber'>>) => {
    await updateDoc(doc(db, 'lenkungsplan', id), data);
};

export const deleteLenkungsplanItem = async (id: string) => {
    await deleteDoc(doc(db, 'lenkungsplan', id));
};


// New Control Plan (Advanced)
export async function getControlPlans(): Promise<ControlPlan[]> {
  const q = query(collection(db, 'control-plans'), orderBy('planNumber'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ControlPlan));
}

export async function getControlPlan(id: string): Promise<ControlPlan | null> {
    const docRef = doc(db, 'control-plans', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ControlPlan;
    }
    return null;
}


// Helper function to remove undefined values from an object, which Firestore doesn't support
const removeUndefinedValues = (obj: any): any => {
    if (obj === undefined) {
        return null; // Convert top-level undefined to null
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues);
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Timestamp)) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined) {
                acc[key] = removeUndefinedValues(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

export async function saveControlPlan(plan: ControlPlan | Omit<ControlPlan, 'id'>, userId: string): Promise<string> {
    const isNew = !('id' in plan) || !plan.id;

    if (!plan.planNumber) {
        throw new Error('Plan Number is a required field.');
    }

    const docRef = doc(db, 'control-plans', plan.planNumber);
    
    if (isNew) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            throw new Error(`Ein Control Plan mit der Nummer ${plan.planNumber} existiert bereits.`);
        }
    }

    const dataToSave: ControlPlan = {
        ...plan,
        id: docRef.id,
        lastChangedBy: userId,
        revisionDate: new Date().toISOString(),
        ...(isNew && { createdAt: new Date().toISOString() }),
    };
    
    const cleanedData = removeUndefinedValues(dataToSave);

    await setDoc(docRef, cleanedData, { merge: !isNew });
    return docRef.id;
}


export async function deleteControlPlan(planId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Main document
    const planRef = doc(db, 'control-plans', planId);
    batch.delete(planRef);
    
    await batch.commit();
}

// Recursive function to list all files in a directory and its subdirectories
const listAllFilesRecursive = async (dirRef: StorageReference): Promise<StorageReference[]> => {
    let allFiles: StorageReference[] = [];
    const res = await listAll(dirRef);

    allFiles.push(...res.items);

    for (const folderRef of res.prefixes) {
        const subFiles = await listAllFilesRecursive(folderRef);
        allFiles.push(...subFiles);
    }

    return allFiles;
};

export async function listStorageFiles(path: string): Promise<StorageFile[]> {
    const storage = getAppStorage();
    if (!storage) return [];

    const listRef = ref(storage, path);
    
    // Get all files recursively
    const allItemRefs = await listAllFilesRecursive(listRef);

    const filesMap = new Map<string, Partial<StorageFile>>();

    // Process all files to get their URLs
    for (const itemRef of allItemRefs) {
        try {
            const url = await getDownloadURL(itemRef);
            const isThumbnail = itemRef.name.includes('_200x200.');
            const originalName = isThumbnail 
                ? itemRef.name.replace('_200x200.', '.') 
                : itemRef.name;

            const existing = filesMap.get(originalName) || {};

            if (isThumbnail) {
                filesMap.set(originalName, { ...existing, thumbnailUrl: url, name: originalName });
            } else {
                 filesMap.set(originalName, { ...existing, url: url, name: originalName });
            }
        } catch (error) {
            console.error(`Failed to get download URL for ${itemRef.fullPath}`, error);
        }
    }
    
    // Filter out entries that don't have an original URL (e.g., lone thumbnails)
    return Array.from(filesMap.values()).filter(file => file.url).map(file => file as StorageFile);
}


// Workstation data
export async function getWorkstations(): Promise<Workstation[]> {
  const q = query(collection(db, 'workstations'), orderBy('AP'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Workstation);
}

export async function getWorkstation(ap: string): Promise<Workstation | null> {
    const docRef = doc(db, 'workstations', ap);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Workstation : null;
}

export async function saveWorkstation(workstation: Workstation, isNew?: boolean): Promise<void> {
    const docRef = doc(db, 'workstations', workstation.AP);
    if (isNew) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            throw new Error(`Ein Arbeitsplatz mit dem Kürzel ${workstation.AP} existiert bereits.`);
        }
        await setDoc(docRef, workstation);
    } else {
        await updateDoc(docRef, { ...workstation });
    }
}


// Auftraege
export const getAuftraege = async (): Promise<Auftrag[]> => {
  const q = query(collection(db, 'auftraege'), orderBy('PO'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auftrag));
};

export const getAuftrag = async (po: string): Promise<Auftrag | null> => {
  const docRef = doc(db, 'auftraege', po);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Auftrag : null;
};

export const saveAuftrag = async (auftrag: Auftrag): Promise<void> => {
    const docRef = doc(db, 'auftraege', auftrag.PO);
    await setDoc(docRef, auftrag, { merge: true });
};

export const addAuftrag = async (item: Omit<Auftrag, 'id'>) => {
  if (!item.PO) {
    throw new Error("Auftragsnummer (PO) ist ein Pflichtfeld.");
  }
  const docRef = doc(db, 'auftraege', item.PO);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    throw new Error(`Ein Auftrag mit der Nummer ${item.PO} existiert bereits.`);
  }
  await setDoc(docRef, item);
};

export const updateAuftrag = async (id: string, data: Partial<Omit<Auftrag, 'id' | 'PO'>>) => {
  await updateDoc(doc(db, 'auftraege', id), data);
};

export const deleteAuftrag = async (id: string) => {
  await deleteDoc(doc(db, 'auftraege', id));
};


export async function getDnaData(dnaId?: string): Promise<DNA[]> {
    if (dnaId) {
        const docRef = doc(db, 'dna', dnaId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? [docSnap.data() as DNA] : [];
    }
    const q = query(collection(db, 'dna'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as DNA);
}


export async function getOrCreateDnaData(workstation: Workstation, auftrag: Auftrag, processStep: ProcessStep, characteristic: Characteristic): Promise<DNA> {
    if (!auftrag.CP || !processStep.processNumber || !characteristic.itemNumber || !workstation.AP || !auftrag.PO) {
        throw new Error("Missing one or more required IDs to create or get DNA data.");
    }
    
    const idDNA = `${auftrag.CP}~${processStep.processNumber}~${characteristic.itemNumber}~${workstation.AP}~${auftrag.PO}`;
    const docRef = doc(db, 'dna', idDNA);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const existingDna = docSnap.data() as DNA;
        let needsUpdate = false;
        const updates: Partial<DNA> = {};
        
        const isNumeric = (val: any): val is number => typeof val === 'number' && !isNaN(val);

        const checkAndUpdate = (dnaKey: keyof DNA, charKey: keyof Characteristic) => {
            const charValue = characteristic[charKey];
             // Only update if charValue is a valid number and it differs from the existing DNA value
            if (isNumeric(charValue) && existingDna[dnaKey] !== charValue) {
                updates[dnaKey] = charValue as any;
                needsUpdate = true;
            }
        };

        checkAndUpdate('SampleSize', 'sampleSize');
        checkAndUpdate('Frequency', 'frequency');
        
        if (characteristic.charType && existingDna.charType !== characteristic.charType) {
            updates.charType = characteristic.charType;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await updateDoc(docRef, updates);
            return { ...existingDna, ...updates };
        }
        
        return existingDna;
    } else {
        const isNumeric = (val: any): val is number => val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
        
        const newDna: DNA = {
            idDNA,
            idPs: processStep.id,
            idChar: characteristic.id,
            CP: auftrag.CP,
            OP: processStep.processNumber,
            Char: characteristic.itemNumber,
            WP: workstation.AP,
            PO: auftrag.PO,
            LSL: characteristic.lsl,
            LCL: characteristic.lcl,
            CL: characteristic.cl,
            UCL: characteristic.ucl,
            USL: characteristic.usl,
            sUSL: characteristic.sUSL,
            SampleSize: isNumeric(characteristic.sampleSize) ? Number(characteristic.sampleSize) : undefined,
            Frequency: isNumeric(characteristic.frequency) ? Number(characteristic.frequency) : undefined,
            charType: characteristic.charType,
            imageUrl: characteristic.imageUrl,
        };
        await setDoc(docRef, newDna);
        return newDna;
    }
}

const cleanDnaDataForSave = (data: Partial<DNA>): Partial<DNA> => {
    const cleaned = { ...data };
    const numericKeys: (keyof DNA)[] = ['LSL', 'LCL', 'CL', 'UCL', 'USL', 'sUSL', 'SampleSize', 'Frequency'];
    
    for (const key of numericKeys) {
        const value = cleaned[key];
        if (value === '' || value === null || value === undefined) {
            cleaned[key] = undefined;
        } else {
            const num = Number(value);
            cleaned[key] = isNaN(num) ? undefined : num;
        }
    }
    
    // Remove all top-level undefined properties
    return Object.fromEntries(Object.entries(cleaned).filter(([, v]) => v !== undefined));
}

export async function saveDnaData(dnaData: Partial<DNA> & { idDNA: string }): Promise<DNA> {
    const docRef = doc(db, 'dna', dnaData.idDNA);
    const cleanedData = cleanDnaDataForSave(dnaData);
    await setDoc(docRef, cleanedData, { merge: true });
    const docSnap = await getDoc(docRef);
    return docSnap.data() as DNA;
}


export const saveSampleData = async (sampleData: Omit<SampleData, 'id' | 'userEmail'>, sampleId?: string, isNew?: boolean): Promise<SampleData & {id: string}> => {
    const id = sampleId || `${sampleData.dnaId}_${new Date(sampleData.timestamp).getTime()}`;
    const sampleRef = doc(db, 'samples', id);
    const user = auth.currentUser;
    
    const dataToSave: any = {
      ...sampleData, 
      userId: user?.uid, 
      userEmail: user?.email || 'unknown'
    };

    if (dataToSave.charType === 'A' && dataToSave.values) {
        delete dataToSave.values;
    }
    
    if (dataToSave.charType !== 'A' && dataToSave.defects !== undefined) {
        delete dataToSave.defects;
    }


    await setDoc(sampleRef, dataToSave, { merge: !isNew });

    // Update DNA with last check info
    const dnaRef = doc(db, 'dna', sampleData.dnaId);
    await updateDoc(dnaRef, {
        checkStatus: sampleData.exception ? 'Out of Spec' : 'OK',
        lastCheckTimestamp: sampleData.timestamp,
        ...(sampleData.imageUrl && { imageUrlLatestSample: sampleData.imageUrl }),
        ...(sampleData.note && { Memo: sampleData.note }),
    });

    return { ...sampleData, id };
};

export const deleteSample = async (sampleId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Nicht authentifiziert.");
    
    const profile = await getProfile(user);
    if (profile?.role !== 'admin') {
        throw new Error("Nur Administratoren dürfen Stichproben löschen.");
    }
    await deleteDoc(doc(db, 'samples', sampleId));
};

export const getSample = async (sampleId: string): Promise<SampleData | null> => {
    const docRef = doc(db, 'samples', sampleId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as SampleData : null;
};

export const getSamplesForDna = async (dnaId: string, count?: number): Promise<SampleData[]> => {
    const q = query(
        collection(db, "samples"), 
        where("dnaId", "==", dnaId)
    );
    
    const snapshot = await getDocs(q);
    let samples = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SampleData));

    // Sort client-side
    samples.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    if (count) {
        samples = samples.slice(-count);
    }
    
    return samples;
};


// Incident Management
export const getIncidents = (
  onSuccess: (incidents: Incident[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(collection(db, 'incidents'), orderBy('reportedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const incidents: Incident[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
    onSuccess(incidents);
  }, onError);
};

export const getIncident = async (id: string): Promise<Incident | null> => {
    const docRef = doc(db, 'incidents', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Incident : null;
};


export const addIncident = async (incidentData: Omit<Incident, 'id' | 'reportedBy'>, id?: string) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("You must be logged in to report an incident.");
    }

    const dataToSave: any = {
        ...incidentData,
    };
    
    const isNew = !id;
    
    if (isNew) {
        dataToSave.reportedAt = serverTimestamp();
        dataToSave.reportedBy = {
            uid: user.uid,
            email: user.email,
        };
    }

    // Remove empty optional fields so they are not saved in Firestore
    if (!dataToSave.attachmentUrl) delete dataToSave.attachmentUrl;
    if (!dataToSave.components || dataToSave.components.length === 0) delete dataToSave.components;
    if (!dataToSave.affectedUser) delete dataToSave.affectedUser;
    if (!dataToSave.po) delete dataToSave.po;
    if (!dataToSave.op) delete dataToSave.op;
    if (!dataToSave.lot) delete dataToSave.lot;
    
    const docId = id || `${incidentData.workplace}_${Date.now()}`;
    const docRef = doc(db, 'incidents', docId);

    if (isNew) {
        await setDoc(docRef, dataToSave);
    } else {
        await updateDoc(docRef, dataToSave);
    }
};

export const deleteIncident = async (id: string) => {
    await deleteDoc(doc(db, 'incidents', id));
};

// Event Management for Shopfloor
export const getEvents = (
  onSuccess: (events: Event[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(collection(db, 'events'), orderBy('eventDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const events: Event[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    onSuccess(events);
  }, onError);
};

export const getEvent = async (id: string): Promise<Event | null> => {
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Event : null;
};

export const addEvent = async (eventData: Omit<Event, 'id'>) => {
    const dataToSave: any = { ...eventData };

    // Ensure optional fields are not saved if empty
    if (!dataToSave.workplace) delete dataToSave.workplace;
    if (!dataToSave.po) delete dataToSave.po;
    if (!dataToSave.op) delete dataToSave.op;
    if (!dataToSave.lot) delete dataToSave.lot;
    if (!dataToSave.attachmentUrl) delete dataToSave.attachmentUrl;

    await addDoc(collection(db, 'events'), dataToSave);
};

export const updateEvent = async (id: string, eventData: Partial<Event>) => {
    const docRef = doc(db, 'events', id);
    await updateDoc(docRef, eventData);
};

export const deleteEvent = async (id: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Nicht authentifiziert.");
    
    const profile = await getProfile(user);
    if (profile?.role !== 'admin') {
        throw new Error("Nur Administratoren dürfen Events löschen.");
    }
    await deleteDoc(doc(db, 'events', id));
};
