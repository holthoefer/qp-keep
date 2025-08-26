import { getNotes } from '@/lib/actions';
import { NoteList } from '@/components/notes/note-list';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const notes = await getNotes();

  return (
    <SidebarProvider>
      <Sidebar>
        <NoteList notes={notes} />
      </Sidebar>
      <SidebarInset>
        <div className="h-screen">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
