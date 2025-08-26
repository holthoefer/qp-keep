import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Note } from './types';

const notesCollection = collection(db, 'notes');

// Helper to convert Firestore Timestamps to ISO strings
const mapFirestoreDocToNote = (doc: any): Note => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
  };
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const q = query(notesCollection, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
     if (querySnapshot.empty) {
      console.log('No notes found, seeding initial data...');
      await seedInitialData();
      const seededSnapshot = await getDocs(q);
      return seededSnapshot.docs.map(mapFirestoreDocToNote);
    }
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


const seedInitialData = async () => {
    const initialNotes: Omit<Note, 'id'>[] = [
    {
      title: 'Welcome to Keep-Know',
      content: 'This is your first note! You can edit it, delete it, or create new ones. Try out the AI-powered tag suggestion feature by adding some content and clicking "Suggest Tags".',
      tags: ['welcome', 'getting-started'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Meeting Recap: Q3 Planning',
      content: 'Discussed the Q3 product roadmap. Key decisions: prioritize the new dashboard feature (Project Phoenix) and allocate more resources to marketing for the upcoming launch. User feedback integration is crucial. Follow up with Alex about the design mockups.',
      tags: ['work', 'meeting', 'planning', 'q3'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      title: 'Grocery List',
      content: 'Milk, Eggs, Bread, Cheese, Coffee beans, Apples, Bananas, Spinach.',
      tags: ['personal', 'shopping'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];

  const batchPromises = initialNotes.map(note => {
     const dataToCreate = {
        title: note.title,
        content: note.content,
        tags: note.tags,
        createdAt: Timestamp.fromDate(new Date(note.createdAt)),
        updatedAt: Timestamp.fromDate(new Date(note.updatedAt)),
      };
    return addDoc(notesCollection, dataToCreate);
  });

  await Promise.all(batchPromises);
  console.log('Initial data seeded to Firestore.');
};
