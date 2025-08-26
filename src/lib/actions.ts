'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as Data from './data';
import type { Note } from './types';
import { suggestTags } from '@/ai/flows/suggest-tags';

export async function login(data: FormData) {
  // In a real app, you'd validate credentials against a database.
  // For this demo, we'll just accept any input to proceed.
  redirect('/notes');
}

export async function getNotes(): Promise<Note[]> {
  return Data.getNotes();
}

export async function getNote(id: string): Promise<Note | undefined> {
  return Data.getNote(id);
}

const noteSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
  tags: z.string().transform(val => val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : []),
});

export async function saveNoteAction(formData: FormData) {
  const noteId = formData.get('id') as string | null;

  const validatedFields = noteSchema.safeParse({
    id: noteId || undefined,
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    console.error(validatedFields.error);
    return { error: 'Invalid note data. Please check your inputs.' };
  }
  
  const dataToSave = { ...validatedFields.data };
  
  if (noteId && noteId !== 'new') {
    dataToSave.id = noteId;
  } else {
    // This is a new note, so we don't pass an ID.
    delete dataToSave.id;
  }
  
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
