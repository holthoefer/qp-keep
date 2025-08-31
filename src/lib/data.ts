
'use client';

import { db, auth, getAppStorage } from './firebase';
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
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { suggestTags } from '@/ai/flows/suggest-tags';
import type { User } from 'firebase/auth';
import type { ControlPlan, ControlPlanItem, Note, UserProfile, StorageFile, Workstation, Auftrag, DNA, SampleData, ProcessStep, Characteristic } from '@/types';


export { getAppStorage, auth };

// Note Management
export const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'userEmail'> & { userEmail: string }) => {
    const userProfile = await getProfile(note.userId);
    if (userProfile?.status !== 'active') {
        throw new Error('Ihr Konto ist inaktiv. Sie können keine neuen Notizen erstellen.');
    }
    
    let tags: string[] = [];
    try {
        const result = await suggestTags({ noteContent: `${note.title}\n${note.content}` });
        tags = result.tags || [];
    } catch (error) {
        console.error("Error generating tags, saving note without them.", error);
    }

    await addDoc(collection(db, 'notes'), {
        ...note,
        tags: tags,
        createdAt: serverTimestamp(),
    });
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
export const saveOrUpdateUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user', // Default role
            status: 'active', // Default status
            createdAt: serverTimestamp()
        });
    }
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', userId);
    try {
        const userDocSnap = await getDoc(userDocRef);
        return userDocSnap.exists() ? { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile : null;
    } catch (error) {
        console.error("Error fetching profile for", userId, error);
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


// Helper to remove undefined values from an object, which Firestore doesn't support
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

    const docRef = isNew ? doc(collection(db, 'control-plans')) : doc(db, 'control-plans', plan.id);
    
    const dataToSave: ControlPlan = {
        ...plan,
        id: docRef.id, // always use the reference's ID
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

export async function listStorageFiles(path: string): Promise<StorageFile[]> {
    const storage = getAppStorage();
    if (!storage) return [];

    const listRef = ref(storage, path);
    const res = await listAll(listRef);
    const files: StorageFile[] = [];

    for (const itemRef of res.items) {
        try {
            const url = await getDownloadURL(itemRef);
            const isThumbnail = itemRef.name.includes('_200x200.');
            
            if (!isThumbnail) {
                const originalName = itemRef.name;
                const extensionIndex = originalName.lastIndexOf('.');
                const nameWithoutExt = originalName.substring(0, extensionIndex);
                const extension = originalName.substring(extensionIndex);
                const thumbnailName = `${nameWithoutExt}_200x200${extension}`;
                
                // Find corresponding thumbnail in the full list
                const thumbRef = res.items.find(i => i.name === thumbnailName);
                let thumbnailUrl: string | undefined = undefined;
                if (thumbRef) {
                    try {
                        thumbnailUrl = await getDownloadURL(thumbRef);
                    } catch (e) {
                         console.warn(`Could not get thumbnail URL for ${thumbnailName}`, e);
                    }
                }

                files.push({ url, name: itemRef.name, thumbnailUrl });
            }
        } catch (error) {
            console.error(`Failed to get download URL for ${itemRef.fullPath}`, error);
        }
    }

    return files;
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
    if (!auftrag.CP || !processStep.id || !characteristic.id || !workstation.AP || !auftrag.PO) {
        throw new Error("Missing one or more required IDs to create or get DNA data.");
    }
    
    const idDNA = `${auftrag.CP}-${processStep.id}-${characteristic.id}-${workstation.AP}-${auftrag.PO}`;
    const docRef = doc(db, 'dna', idDNA);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as DNA;
    } else {
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
            SampleSize: characteristic.sampleSize,
            Frequency: characteristic.frequency,
            imageUrl: characteristic.imageUrl,
        };
        await setDoc(docRef, newDna);
        return newDna;
    }
}

export async function saveDnaData(dnaData: Partial<DNA> & { idDNA: string }): Promise<DNA> {
    const docRef = doc(db, 'dna', dnaData.idDNA);
    await setDoc(docRef, dnaData, { merge: true });
    const docSnap = await getDoc(docRef);
    return docSnap.data() as DNA;
}


export const saveSampleData = async (sampleData: Omit<SampleData, 'id'>, sampleId?: string, isNew?: boolean): Promise<SampleData & {id: string}> => {
    const id = sampleId || `${sampleData.dnaId}_${new Date(sampleData.timestamp).getTime()}`;
    const sampleRef = doc(db, 'samples', id);
    
    await setDoc(sampleRef, sampleData, { merge: !isNew });

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

export const getSample = async (sampleId: string): Promise<SampleData | null> => {
    const docRef = doc(db, 'samples', sampleId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as SampleData : null;
};

export const getSamplesForDna = async (dnaId: string, count?: number): Promise<SampleData[]> => {
    let q = query(collection(db, "samples"), where("dnaId", "==", dnaId));
    
    const snapshot = await getDocs(q);
    let samples = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SampleData));
    
    // Sort on the client
    samples.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (count) {
        samples = samples.slice(0, count);
    }
    
    // The samples are now sorted from newest to oldest. Reverse them for chronological order in charts.
    return samples.reverse();
};
