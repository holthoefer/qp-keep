import { getNote } from '@/lib/actions';
import { NoteEditor } from '@/components/notes/note-editor';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function NotesPage({ searchParams }: { searchParams: { noteId?: string } }) {
  const noteId = searchParams.noteId;

  if (noteId) {
    const note = noteId === 'new' ? undefined : await getNote(noteId);
    if (noteId !== 'new' && !note) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-headline font-bold">Note Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested note does not exist.</p>
           <Button asChild>
            <Link href="/notes">Go Back</Link>
          </Button>
        </div>
      )
    }
    return <NoteEditor key={noteId} note={note} />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center p-4">
      <KeepKnowLogo className="h-24 w-24 text-primary/50 mb-4" />
      <h2 className="text-2xl font-headline font-bold">Welcome to Keep-Know</h2>
      <p className="text-muted-foreground max-w-md">
        Select a note from the sidebar to start editing, or create a new one to capture your thoughts.
      </p>
    </div>
  );
}
