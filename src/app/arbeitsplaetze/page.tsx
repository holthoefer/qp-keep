'use client';

import { KeepKnowLogo } from "@/components/icons";
import { WorkstationGrid } from "@/components/workstations/WorkstationGrid";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth-context";
import { Book, ListChecks, Shield, Target } from "lucide-react";


export default function ArbeitsplaetzePage() {
    const router = useRouter();
    const { logout, isAdmin } = useAuth();
    
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
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                        Notizen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/cp')}>
                        <Target className="mr-2 h-4 w-4" />
                        CP
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/controlplan')}>
                        <ListChecks className="mr-2 h-4 w-4" />
                        Control Plan
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/lenkungsplan')}>
                        <Book className="mr-2 h-4 w-4" />
                        Lenkungsplan
                    </Button>
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Button>
                    )}
                    <Button onClick={handleLogout} variant="secondary">
                        Ausloggen
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                <WorkstationGrid />
            </main>
        </div>
    );
}