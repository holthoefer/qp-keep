
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
} from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { suggestTags } from '@/ai/flows/suggest-tags';
import type { User } from 'firebase/auth';
import type { ControlPlan, ControlPlanItem, Note, UserProfile, StorageFile } from '@/types';


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
    q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'notes'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const notes: Note[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
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
export const getDb = () => db;

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

export async function saveControlPlan(plan: Omit<ControlPlan, 'id'>, userId: string): Promise<string>;
export async function saveControlPlan(plan: ControlPlan, userId: string): Promise<string>;
export async function saveControlPlan(plan: ControlPlan | Omit<ControlPlan, 'id'>, userId: string): Promise<string> {
    const isNew = !('id' in plan) || !plan.id;
    const docRef = isNew ? doc(collection(db, 'control-plans')) : doc(db, 'control-plans', plan.id);
    
    const dataToSave = {
        ...plan,
        id: docRef.id,
        lastChangedBy: userId,
        revisionDate: new Date().toISOString(),
        createdAt: isNew ? new Date().toISOString() : (plan as ControlPlan).createdAt,
    };
    
    const cleanedData = removeUndefinedValues(dataToSave);

    await setDoc(docRef, cleanedData, { merge: true });
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

