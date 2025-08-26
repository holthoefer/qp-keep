
'use client';

import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: Timestamp;
}

export const addNote = async (note: Omit<Note, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, 'notes'), {
    ...note,
    createdAt: serverTimestamp(),
  });
};

export const getNotes = (
  userId: string,
  callback: (notes: Note[]) => void,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);
  const q = query(collection(db, 'notes'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notes: Note[] = [];
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() } as Note);
    });
    callback(notes);
    setLoading(false);
  }, (error) => {
    console.error("Error fetching notes: ", error);
    setLoading(false);
  });
  
  return unsubscribe;
};

export const deleteNote = async (noteId: string) => {
    const noteRef = doc(db, 'notes', noteId);
    await deleteDoc(noteRef);
}
