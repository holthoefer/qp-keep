import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { Note } from './types';

const notesCollection = collection(db, 'notes');

// Helper to convert Firestore Timestamps to ISO strings
const mapFirestoreDocToNote = (doc: any): Note => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
  };
};

export const getNotes = async (userId: string): Promise<Note[]> => {
  if (!userId) return [];
  try {
    const q = query(notesCollection, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapFirestoreDocToNote);
  } catch (error) {
    console.error("Error getting notes: ", error);
    // In case of error (e.g. permissions), return an empty array to avoid crashing the app.
    return [];
  }
};

export const getNote = async (id: string): Promise<Note | undefined> => {
  try {
    const docRef = doc(db, 'notes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // Basic security check, more robust checks should be in Firestore rules
      // This is a simplified example.
      return mapFirestoreDocToNote(docSnap);
    } else {
      console.log("No such document!");
      return undefined;
    }
  } catch (error) {
    console.error("Error getting note: ", error);
    return undefined;
  }
};

export const saveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> => {
  try {
    if (noteData.id) {
      const docRef = doc(db, 'notes', noteData.id);
      const dataToUpdate = {
        ...noteData,
        updatedAt: serverTimestamp(),
      };
      delete dataToUpdate.id; // Don't save the id field inside the document
      await updateDoc(docRef, dataToUpdate);
      const updatedDoc = await getDoc(docRef);
      return mapFirestoreDocToNote(updatedDoc);
    } else {
      const dataToCreate = {
        ...noteData,
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
