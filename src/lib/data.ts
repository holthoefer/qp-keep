import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { Note, UserProfile } from './types';

const notesCollection = collection(db, 'notes');
const usersCollection = collection(db, 'users');

// Helper to convert Firestore Timestamps to ISO strings in any object
const mapTimestamps = (data: any) => {
  const newData: { [key: string]: any } = {};
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      newData[key] = data[key].toDate().toISOString();
    } else {
      newData[key] = data[key];
    }
  }
  return newData;
};

const mapFirestoreDocToNote = (doc: any): Note => {
  const data = doc.data();
  const mappedData = mapTimestamps(data);
  return {
    id: doc.id,
    ...mappedData,
  } as Note;
};

const mapFirestoreDocToUserProfile = (doc: any): UserProfile => {
    const data = doc.data();
    const mappedData = mapTimestamps(data);
    return {
      id: doc.id,
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
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return mapFirestoreDocToUserProfile(docSnap);
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
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
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error('Failed to update user profile.');
    }
};
