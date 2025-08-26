import type { Note } from './types';

// In a real app, this would be a database.
// For this demo, we'll use an in-memory array to simulate a database.
let notes: Note[] = [
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

export const getNotes = async (): Promise<Note[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getNote = async (id: string): Promise<Note | undefined> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 50));
  return notes.find(note => note.id === id);
};

export const saveNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  if (noteData.id) {
    const index = notes.findIndex(n => n.id === noteData.id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...noteData, updatedAt: new Date().toISOString() };
      return notes[index];
    }
  }
  
  const newNote: Note = {
    ...noteData,
    id: (Math.random() + 1).toString(36).substring(7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(newNote);
  return newNote;
};

export const deleteNote = async (id: string): Promise<void> => {
    // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  notes = notes.filter(note => note.id !== id);
};
