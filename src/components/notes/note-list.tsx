'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusCircle } from "lucide-react";
import type { Note } from "@/lib/types";
import { KeepKnowLogo } from "@/components/icons";
import { NoteCard } from "./note-card";
import { Button } from "@/components/ui/button";
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu
} from "@/components/ui/sidebar";

export function NoteList({ notes }: { notes: Note[] }) {
  const searchParams = useSearchParams();
  const currentNoteId = searchParams.get('noteId');

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader>
        <div className="flex items-center justify-start gap-3 px-2">
            <Link href="/notes" className="flex items-center gap-3">
              <KeepKnowLogo className="h-8 w-8 text-primary" />
              <span className="font-headline text-2xl font-bold tracking-tighter">Keep-Know</span>
            </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Link href="/notes?noteId=new" className="block">
              <Button className="w-full">
                <PlusCircle />
                New Note
              </Button>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Notes</SidebarGroupLabel>
          <SidebarGroupContent>
             <SidebarMenu>
               {notes.map(note => (
                 <NoteCard key={note.id} note={note} isActive={currentNoteId === note.id} />
               ))}
             </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </div>
  );
}
