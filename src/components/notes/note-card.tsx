'use client';

import Link from 'next/link';
import type { Note } from '@/lib/types';
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { formatDistanceToNow } from 'date-fns';

export function NoteCard({ note, isActive }: { note: Note; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <Link href={`/notes?noteId=${note.id}`} className="w-full">
        <SidebarMenuButton isActive={isActive} className="h-auto py-2">
          <div className="flex flex-col items-start w-full overflow-hidden text-left">
            <span className="font-medium truncate w-full">{note.title || 'Untitled Note'}</span>
            <p className="text-xs text-muted-foreground truncate w-full mt-1">
              {note.content || 'No content'}
            </p>
            <time className="text-xs text-muted-foreground/80 mt-2">
              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
            </time>
          </div>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}
