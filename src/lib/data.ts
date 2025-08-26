import type { Note } from './types';

// In a real app, this would be a database.
// For this demo, we'll use an in-memory array to simulate a database,
// backed by localStorage for persistence across sessions.
const LOCAL_STORAGE_KEY = 'keep-know-notes';

let notes: Note[] = [];

// Helper function to get notes from localStorage
const loadNotesFromLocalStorage = (): Note[] => {
  if (typeof window === 'undefined') {
    // Return a default structure if window is not defined (e.g., during server-side rendering)
    return [];
  }
  try {
    const savedNotes = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedNotes) {
      return JSON.parse(savedNotes);
    }
  } catch (error) {
    console.error('Failed to load notes from localStorage:', error);
  }
  return [];
};

// Helper function to save notes to localStorage
const saveNotesToLocalStorage = (notesToSave: Note[]) => {
   if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notesToSave));
  } catch (error) {
    console.error('Failed to save notes to localStorage:', error);
  }
};

const seedInitialData = () => {
  const initialNotes: Note[] = [
    {
      id: '1',
      title: 'Welcome to Keep-Know',
      content: 'This is your first note! You can edit it, delete it, or create new ones. Try out the AI-powered tag suggestion feature by adding some content and clicking "Suggest Tags".',
      tags: ['welcome', 'getting-started'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Meeting Recap: Q3 Planning',
      content: 'Discussed the Q3 product roadmap. Key decisions: prioritize the new dashboard feature (Project Phoenix) and allocate more resources to marketing for the upcoming launch. User feedback integration is crucial. Follow up with Alex about the design mockups.',
      tags: ['work', 'meeting', 'planning', 'q3'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '3',
      title: 'Grocery List',
      content: 'Milk, Eggs, Bread, Cheese, Coffee beans, Apples, Bananas, Spinach.',
      tags: ['personal', 'shopping'],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];
  notes = initialNotes;
  saveNotesToLocalStorage(notes);
};


// Initialize notes
const loadedNotes = loadNotesFromLocalStorage();
if (loadedNotes.length > 0) {
  notes = loadedNotes;
} else if (typeof window !== 'undefined') {
  // Seed only on client side if no notes are found
  seedInitialData();
}


export const getNotes = async (): Promise<Note[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  const notesFromStorage = loadNotesFromLocalStorage();
  if (notesFromStorage.length === 0 && typeof window !== 'undefined') {
    seedInitialData();
    notes = loadNotesFromLocalStorage();
  } else {
    notes = notesFromStorage;
  }
  return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getNote = async (id: string): Promise<Note | undefined> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50));
  const notesFromStorage = loadNotesFromLocalStorage();
  notes = notesFromStorage;
  return notes.find(note => note.id === id);
};

export const saveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const notesFromStorage = loadNotesFromLocalStorage();
  notes = notesFromStorage;
  
  if (noteData.id) {
    const index = notes.findIndex(n => n.id === noteData.id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...noteData, updatedAt: new Date().toISOString() };
      saveNotesToLocalStorage(notes);
      return notes[index];
    }
  }
  
  // This is a new note
  const newNote: Note = {
    ...noteData,
    id: (Date.now() + Math.random()).toString(36), // More unique ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(newNote);
  saveNotesToLocalStorage(notes);
  return newNote;
};

export const deleteNote = async (id: string): Promise<void> => {
    // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  const notesFromStorage = loadNotesFromLocalStorage();
  notes = notesFromStorage.filter(note => note.id !== id);
  saveNotesToLocalStorage(notes);
};
