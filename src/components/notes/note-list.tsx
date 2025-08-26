'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusCircle, LogOut, User } from "lucide-react";
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
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function NoteList({ notes }: { notes: Note[] }) {
  const searchParams = useSearchParams();
  const currentNoteId = searchParams.get('noteId');

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-3 px-2 w-full">
            <Link href="/notes" className="flex items-center gap-3">
              <KeepKnowLogo className="h-8 w-8 text-primary" />
              <span className="font-headline text-2xl font-bold tracking-tighter">Keep-Know</span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <SidebarFooter>
      </SidebarFooter>
    </div>
  );
}
