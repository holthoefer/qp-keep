'use server';

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { Note, UserProfile } from './types';

const notesCollection = collection(db, 'notes');
const usersCollection = collection(db, 'users');

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
  if (!userId) return [];
  try {
    const q = query(notesCollection, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapFirestoreDocToNote);
  } catch (error) {
    console.error("Error getting notes: ", error);
    return [];
  }
};

export const getNote = async (id: string): Promise<Note | undefined> => {
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
      const docRef = await addDoc(notesCollection, dataToCreate);
      const newDoc = await getDoc(docRef);
      return mapFirestoreDocToNote(newDoc);
    }
  } catch (error) {
    console.error("Error saving note: ", error);
    throw new Error('Failed to save note.');
  }
};

export const deleteNote = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notes', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting note: ", error);
    throw new Error('Failed to delete note.');
  }
};

// --- User Profile Functions ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) {
        console.log("getUserProfile: No userId provided.");
        return null;
    }
    try {
        const q = query(usersCollection, where("uid", "==", userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`No user profile found for UID: ${userId}`);
            return null;
        }
        
        // Should only be one document, but we'll take the first.
        const userDoc = querySnapshot.docs[0];
        return mapFirestoreDocToUserProfile(userDoc);

    } catch (error) {
        console.error(`Error getting user profile for UID: ${userId}`, error);
        return null;
    }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
    try {
        const q = query(usersCollection, orderBy('email', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(mapFirestoreDocToUserProfile);
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
}

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    try {
        // The document ID is the UID
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error('Failed to update user profile.');
    }
};

    