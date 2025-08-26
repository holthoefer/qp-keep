'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as Data from './data';
import type { Note } from './types';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export async function login(data: FormData) {
  const email = data.get('email') as string;
  const password = data.get('password') as string;

  // In a real app, you would handle this more gracefully.
  // For this demo, we will redirect to notes on successful login.
  // Firebase Auth SDK for Node.js doesn't manage session state,
  // so we can't truly "log in" on the server. The client will need to handle auth state.
  // This is a simplified example.
  redirect('/notes');
}

export async function logout() {
  redirect('/');
}

export async function getNotes(userId: string): Promise<Note[]> {
  if (!userId) return [];
  return Data.getNotes(userId);
}

export async function getNote(id: string): Promise<Note | undefined> {
  return Data.getNote(id);
}

const noteSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  tags: z.string().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : []),
});

export async function saveNoteAction(formData: FormData) {
  const noteId = formData.get('id') as string | null;
  const userId = formData.get('userId') as string;

  if (!userId) {
    return { error: 'You must be logged in to save a note.' };
  }

  const validatedFields = noteSchema.safeParse({
    id: noteId && noteId !== 'new' ? noteId : undefined,
    userId: userId,
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
  });
  
  if (!validatedFields.success) {
    console.error(validatedFields.error);
    return { error: 'Invalid note data. Please check your inputs.' };
  }
  
  const dataToSave = { ...validatedFields.data };
  
  try {
    const savedNote = await Data.saveNote(dataToSave);
    revalidatePath('/notes');
    redirect(`/notes?noteId=${savedNote.id}`);
  } catch (error) {
     console.error('Failed to save note:', error);
     return { error: 'Failed to save the note to the database.' };
  }
}

export async function deleteNoteAction(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) {
    return { error: 'Note ID is missing.' };
  }
  await Data.deleteNote(id);
  revalidatePath('/notes');
  redirect('/notes');
}

export async function getAiTags(noteContent: string): Promise<{ tags?: string[]; error?: string }> {
  if (!noteContent.trim() || noteContent.trim().split(' ').length < 3) {
    return { error: 'Please provide more content for better tag suggestions.' };
  }
  try {
    const result = await suggestTags({ noteContent });
    return { tags: result.tags };
  } catch (error) {
    console.error('AI tag suggestion failed:', error);
    return { error: 'Failed to suggest tags at the moment. Please try again later.' };
  }
}
