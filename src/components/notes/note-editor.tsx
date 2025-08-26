'use client';

import { useState } from 'react';
import type { Note } from '@/lib/types';
import { saveNoteAction, deleteNoteAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TagInput } from './tag-input';
import { Save, Trash2, FilePlus, XCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function NoteEditor({ note }: { note?: Note }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const router = useRouter();
  const { user, loading } = useAuth();

  const isNewNote = !note?.id;

  const handleCancel = () => {
    router.push('/notes');
  }
  
  const handleSave = (formData: FormData) => {
    if (!user) return;
    formData.set('title', title);
    formData.set('content', content);
    formData.set('tags', tags.join(','));
    formData.set('userId', user.uid);
    saveNoteAction(formData);
  }

  if (loading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (!user) {
      // This should ideally not happen if routing is protected.
      // But as a fallback, we can show a message.
      router.push('/');
      return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 p-4 pb-0">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-headline text-2xl font-bold truncate">
            {isNewNote ? 'Create New Note' : 'Edit Note'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" type="button" onClick={handleCancel}>
              <XCircle />
              Cancel
            </Button>
            <form id="note-editor-form" action={handleSave} className="m-0">
               <input type="hidden" name="id" value={note?.id ?? 'new'} />
               <Button type="submit">
                 {isNewNote ? <FilePlus /> : <Save />}
                 {isNewNote ? 'Create Note' : 'Save Changes'}
               </Button>
            </form>
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
       <div className="m-0 flex h-full flex-col flex-grow min-h-0">
          <div className="flex flex-grow flex-col space-y-4 p-4 min-h-0 bg-white dark:bg-card rounded-b-lg">
              <div className="flex-shrink-0 space-y-2">
                 <Input
                  name="title"
                  form="note-editor-form"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Note"
                  className="border-0 px-0 text-3xl font-bold font-headline shadow-none focus-visible:ring-0"
                  aria-label="Note title"
                 />

                <TagInput tags={tags} setTags={setTags} noteContent={content} form="note-editor-form" />
              </div>

              <div className="min-h-0 flex-grow">
                <ScrollArea className="h-full">
                  <Textarea
                    name="content"
                    form="note-editor-form"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your brilliant ideas here..."
                    className="h-full min-h-[400px] w-full resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
                    aria-label="Note content"
                  />
                </ScrollArea>
              </div>
          </div>
      </div>
    </div>
  );
}
