'use client';

import { useState } from 'react';
import type { Note } from '@/lib/types';
import { saveNoteAction, deleteNoteAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TagInput } from './tag-input';
import { Save, Trash2, FilePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NoteEditor({ note }: { note?: Note }) {
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [content, setContent] = useState(note?.content || '');

  const isNewNote = !note?.id;
  const formAction = isNewNote ? saveNoteAction : saveNoteAction;

  return (
    <div className="flex h-full flex-col">
      <form id="note-editor-form" action={formAction} className="flex flex-grow flex-col space-y-4 p-4 min-h-0">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
              <h2 className="font-headline text-2xl font-bold truncate">
                {isNewNote ? 'Create New Note' : 'Edit Note'}
              </h2>
              <div className="flex items-center gap-2">
                <Button type="submit">
                  {isNewNote ? <FilePlus /> : <Save />}
                  {isNewNote ? 'Create Note' : 'Save Changes'}
                </Button>
                {!isNewNote && (
                   <form action={deleteNoteAction} className="m-0">
                    <input type="hidden" name="id" value={note.id} />
                    <Button variant="destructive" size="icon" type="submit" aria-label="Delete note">
                      <Trash2 />
                    </Button>
                  </form>
                )}
              </div>
            </div>
        </div>
        
        <input type="hidden" name="id" value={note?.id ?? ''} />
        <input type="hidden" name="tags" value={tags.join(',')} />
        
        <div className="flex-shrink-0 space-y-2">
           <Input
            name="title"
            defaultValue={note?.title}
            placeholder="Untitled Note"
            className="border-0 bg-transparent px-0 text-3xl font-bold font-headline shadow-none focus-visible:ring-0"
            aria-label="Note title"
           />

          <TagInput tags={tags} setTags={setTags} noteContent={content} />
        </div>

        <div className="min-h-0 flex-grow">
          <ScrollArea className="h-full">
            <Textarea
              name="content"
              defaultValue={note?.content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your brilliant ideas here..."
              className="h-full min-h-[400px] w-full resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              aria-label="Note content"
            />
          </ScrollArea>
        </div>
      </form>
    </div>
  );
}
