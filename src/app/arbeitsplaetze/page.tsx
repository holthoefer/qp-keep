
'use client';

import { KeepKnowLogo } from "@/components/icons";
import { WorkstationGrid } from "@/components/workstations/WorkstationGrid";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth-context";
import { Book, ListChecks, Shield, Target, FolderKanban, LogOut, BrainCircuit, FileImage, Siren } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function ArbeitsplaetzePage() {
    const router = useRouter();
    const { user, logout, isAdmin } = useAuth();
    
    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2">
                <KeepKnowLogo className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
                    Arbeitsplätze
                </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                        Notizen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/incidents')}>
                        <Siren className="mr-2 h-4 w-4" />
                        Status-Liste
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        DNA
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/PO')}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        PO
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                        <Target className="mr-2 h-4 w-4" />
                        CP
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                        <Book className="mr-2 h-4 w-4" />
                        LP
                    </Button>
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => router.push('/storage')}>
                          <FileImage className="mr-2 h-4 w-4" />
                          Storage
                        </Button>
                    )}
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                          <Avatar>
                            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || ''} />
                            <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Ausloggen</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                <WorkstationGrid />
            </main>
        </div>
    );
}
