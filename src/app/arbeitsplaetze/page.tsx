

'use client';

import { WorkstationGrid } from "@/components/workstations/WorkstationGrid";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth-context";
import { Book, ListChecks, Shield, Target, FolderKanban, LogOut, Network, FileImage, Siren, Wrench, LayoutGrid, MoreVertical, StickyNote } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import logo from '../Logo.png';


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
                    <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
                    <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
                        qp
                    </h1>
                     {/* Desktop View: Full Buttons */}
                    <div className="hidden md:flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                            <Network className="mr-2 h-4 w-4" />
                            DNA
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/PO')}>
                            <FolderKanban className="mr-2 h-4 w-4" />
                            PO
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                            <StickyNote className="mr-2 h-4 w-4" />
                            Notiz
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                            <Wrench className="mr-2 h-4 w-4" />
                            Events
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/incidents')}>
                            <Siren className="mr-2 h-4 w-4" />
                            Incidents
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
                    </div>
                     {/* Mobile View: Icons and Dropdown */}
                    <div className="md:hidden flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/dna')}>
                            <Network className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/PO')}>
                            <FolderKanban className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                            <StickyNote className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push('/events')}>
                                <Wrench className="mr-2 h-4 w-4" />
                                <span>Events</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/incidents')}>
                                <Siren className="mr-2 h-4 w-4" />
                                <span>Incidents</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/cp')}>
                                <Target className="mr-2 h-4 w-4" />
                                <span>CP</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/lenkungsplan')}>
                                <Book className="mr-2 h-4 w-4" />
                                <span>LP</span>
                            </DropdownMenuItem>
                             {isAdmin && <DropdownMenuSeparator />}
                            {isAdmin && (
                                <DropdownMenuItem onClick={() => router.push('/storage')}>
                                    <FileImage className="mr-2 h-4 w-4" />
                                    <span>Storage</span>
                                </DropdownMenuItem>
                            )}
                            {isAdmin && (
                                <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    <span>Admin</span>
                                </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full h-8 w-8">
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
