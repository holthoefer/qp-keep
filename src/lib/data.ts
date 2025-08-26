
'use server';

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { Note, UserProfile, UserProfileQueryResult } from './types';

// --- MOCK DATA ---
const MOCK_USER_PROFILE: UserProfile = {
    id: 'kJsHJfZ0lgav0BOZyitQpezfI352',
    uid: 'kJsHJfZ0lgav0BOZyitQpezfI352',
    email: 'holthofer@gmail.com',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
};

const MOCK_NOTE: Note = {
    id: 'mock-note-1',
    userId: 'kJsHJfZ0lgav0BOZyitQpezfI352',
    title: 'My First Note',
    content: 'This is a mock note. The database connection is currently being blocked by Firebase project settings (likely App Check).',
    tags: ['mock', 'debug'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const USE_MOCK_DATA = false;

// Helper to convert Firestore Timestamps to ISO strings in any object
const mapTimestamps = (data: any) => {
  if (!data) return data;
  const newData: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (data[key] instanceof Timestamp) {
            newData[key] = data[key].toDate().toISOString();
        } else {
            newData[key] = data[key];
        }
    }
  }
  return newData;
};

const mapFirestoreDocToNote = (docSnap: any): Note => {
  const data = docSnap.data();
  const mappedData = mapTimestamps(data);
  return {
    id: docSnap.id,
    ...mappedData,
  } as Note;
};

const mapFirestoreDocToUserProfile = (docSnap: any): UserProfile => {
    const data = docSnap.data();
    const mappedData = mapTimestamps(data);
    return {
      id: docSnap.id,
      ...mappedData,
    } as UserProfile;
}

export const getNotes = async (userId: string): Promise<Note[]> => {
  if (USE_MOCK_DATA) {
      return userId === MOCK_USER_PROFILE.uid ? [MOCK_NOTE] : [];
  }
  if (!userId) return [];
  try {
    const q = query(collection(db, 'notes'), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapFirestoreDocToNote);
  } catch (error) {
    console.error("Error getting notes: ", error);
    return [];
  }
};

export const getNote = async (id: string): Promise<Note | undefined> => {
    if (USE_MOCK_DATA) {
        return id === MOCK_NOTE.id ? MOCK_NOTE : undefined;
    }
  try {
    const docRef = doc(db, 'notes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapFirestoreDocToNote(docSnap);
    } else {
      return undefined;
    }
  } catch (error) {
    console.error("Error getting note: ", error);
    return undefined;
  }
};

export const saveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> => {
    if (USE_MOCK_DATA) {
        const savedNote = { ...MOCK_NOTE, ...noteData, id: noteData.id || MOCK_NOTE.id };
        console.log("Mock saving note:", savedNote);
        return savedNote;
    }
  try {
    const { id, ...data } = noteData;
    if (id) {
      const docRef = doc(db, 'notes', id);
      const dataToUpdate = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(docRef, dataToUpdate);
      const updatedDoc = await getDoc(docRef);
      return mapFirestoreDocToNote(updatedDoc);
    } else {
      const dataToCreate = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'notes'), dataToCreate);
      const newDoc = await getDoc(docRef);
      return mapFirestoreDocToNote(newDoc);
    }
  } catch (error) {
    console.error("Error saving note: ", error);
    throw new Error('Failed to save note.');
  }
};

export const deleteNote = async (id: string): Promise<void> => {
    if (USE_MOCK_DATA) {
        console.log("Mock deleting note:", id);
        return;
    }
  try {
    const docRef = doc(db, 'notes', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting note: ", error);
    throw new Error('Failed to delete note.');
  }
};

// --- User Profile Functions ---

export const getUserProfile = async (userId: string): Promise<UserProfileQueryResult> => {
    if (USE_MOCK_DATA) {
        if (userId === MOCK_USER_PROFILE.uid) {
            return { profile: MOCK_USER_PROFILE, debug: { uid: userId, docsFound: 1, error: "Using Mock Data" } };
        } else {
            return { profile: null, debug: { uid: userId, docsFound: 0, error: "User not found in Mock Data" } };
        }
    }

    if (!userId) {
        return { profile: null, debug: { uid: userId, error: 'No userId provided.', docsFound: 0 } };
    }
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { profile: null, debug: { uid: userId, error: 'No user profile document found.', docsFound: 0 } };
        }
        
        const profile = mapFirestoreDocToUserProfile(docSnap);
        return { profile, debug: { uid: userId, docsFound: 1, error: null } };

    } catch (error: any) {
        console.error(`Error getting user profile for UID: ${userId}`, error);
        return { profile: null, debug: { uid: userId, error: error.message, docsFound: 0 } };
    }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    if (USE_MOCK_DATA) {
        return [MOCK_USER_PROFILE];
    }
    try {
        const q = query(collection(db, 'users'), orderBy('email', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(mapFirestoreDocToUserProfile);
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
}

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    if (USE_MOCK_DATA) {
        console.log("Mock updating user:", uid, data);
        return;
    }
    try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error('Failed to update user profile.');
    }
};

    

    