
'use client';

import { db, auth as clientAuth, getAppStorage } from './firebase';
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


export const auth = clientAuth;

export { getAppStorage };

// Note Management
export const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'userEmail'> & { userEmail: string }) => {
    const userProfile = await getProfile(note.userId);
    if (userProfile?.status !== 'active') {
        throw new Error('Ihr Konto ist inaktiv. Sie können keine neuen Notizen erstellen.');
    }
    try {
        const { tags } = await suggestTags({ noteContent: `${note.title}\n${note.content}` });
        await addDoc(collection(db, 'notes'), {
            ...note,
            tags: tags || [],
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding note with tags:", error);
        await addDoc(collection(db, 'notes'), {
            ...note,
            tags: [],
            createdAt: serverTimestamp(),
        });
    }
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
export const createUserProfile = async (userProfile: Omit<UserProfile, 'createdAt'>) => {
    await setDoc(doc(db, 'users', userProfile.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
    });
};

export const saveOrUpdateUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user', // Default role
            status: 'active', // Default status
            createdAt: serverTimestamp()
        });
    }
};

export const getUserRoles = async (uid: string): Promise<string[]> => {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Handle both `role` (string) and `roles` (array) for backward compatibility
        if (data.roles && Array.isArray(data.roles)) {
            return data.roles;
        }
        if (data.role && typeof data.role === 'string') {
            return [data.role];
        }
    }
    return ['user'];
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
    await addDoc(collection(db, 'controlplan'), { ...item, createdAt: serverTimestamp() });
};

export const updateControlPlanItem = async (id: string, data: Partial<Omit<ControlPlanItem, 'id' | 'createdAt'>>) => {
    await updateDoc(doc(db, 'controlplan', id), data);
};

export const deleteControlPlanItem = async (id: string) => {
    await deleteDoc(doc(db, 'controlplan', id));
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
        createdAt: isNew ? new Date().toISOString() : plan.createdAt,
    };

    await setDoc(docRef, dataToSave, { merge: true });
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

