

'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/hooks/use-auth-context';
import { Loader2, LogOut, ShieldAlert, LayoutGrid, StickyNote, Wrench, Siren, Network, Target, Book, Shield, Send, FolderKanban } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { type UserProfile } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import logo from './Logo.png';
import Link from 'next/link';
import { navigate } from '@/ai/flows/navigate-flow';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';


export default function HomePage() {
  const { user, profile, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [agentInput, setAgentInput] = useState('');
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const isNoteOnlyUser = profile?.status === 'note';

  const handleLogout = async () => {
    await logout();
    router.refresh(); 
  };
  
  const handleAgentSubmit = async () => {
    if (!agentInput.trim()) return;
    
    setIsAgentProcessing(true);
    try {
      const result = await navigate(agentInput);
      
      // Restriction for 'note' status users
      if (isNoteOnlyUser && result.path !== '/notes') {
          toast({
              variant: "destructive",
              title: "Zugriff beschränkt",
              description: "Mit Ihrem aktuellen Status können Sie nur die Notizenseite verwenden.",
          });
          setIsAgentProcessing(false);
          setAgentInput('');
          return;
      }
      
      if (result.path && result.path !== '/#not-found') {
        let finalPath = result.path;
        if(result.message) {
            finalPath += `?message=${encodeURIComponent(result.message)}`;
        }
        router.push(finalPath);
      } else {
        toast({
            variant: "info",
            title: "Unbekannter Befehl",
            description: `Ich habe "${agentInput}" nicht verstanden. Wohin möchten Sie gehen?`,
            action: (
              <div className="flex flex-col gap-2">
                <ToastAction altText="Arbeitsplätze" onClick={() => router.push('/arbeitsplaetze')}>Arbeitsplätze</ToastAction>
                <ToastAction altText="DNA" onClick={() => router.push('/dna')}>DNA</ToastAction>
                <ToastAction altText="Events" onClick={() => router.push('/events')}>Events</ToastAction>
              </div>
            )
        });
      }
    } catch (e: any) {
       toast({
            title: "Fehler beim Agenten",
            description: e.message || "Ein unerwarteter Fehler ist aufgetreten.",
            variant: "destructive"
        });
    } finally {
        setIsAgentProcessing(false);
        setAgentInput('');
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevents adding a new line
        handleAgentSubmit();
    }
  };

  // State 1: AuthProvider handles the main loading state
  if (authLoading) {
    return null; // The AuthProvider will show a loading screen
  }

  // State 2: User is logged in
  if (user) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-between bg-background p-4">
        <div className="w-full max-w-md text-center">
            <div className="flex justify-center">
                <Link href="/qpinfo" aria-label="Zur Info-Seite" className="flex justify-center">
                    <Button variant="ghost" className="mb-4 flex flex-col items-center justify-center space-y-4 h-auto">
                        <Image src={logo} alt="qp Loop Logo" width={256} height={256} className="h-48 w-48 text-primary" />
                    </Button>
                </Link>
            </div>
          
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        onClick={() => router.push('/arbeitsplaetze')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        Arbeitsplätze
                    </Button>
                    <Button 
                        onClick={() => router.push('/dna')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <Network className="mr-2 h-4 w-4" />
                        DNA  (akt. Merkmale)
                    </Button>
                     <Button 
                        onClick={() => router.push('/events')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <Wrench className="mr-2 h-4 w-4" />
                        Events
                    </Button>
                    <Button 
                        onClick={() => router.push('/incidents')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <Siren className="mr-2 h-4 w-4" />
                        Incidents
                    </Button>
                     <Button 
                        onClick={() => router.push('/cp')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <Target className="mr-2 h-4 w-4" />
                        Control Plan {profile && !isAdmin && "(read)"}
                    </Button>
                     <Button 
                        onClick={() => router.push('/PO')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive' || isNoteOnlyUser}
                    >
                        <FolderKanban className="mr-2 h-4 w-4" />
                        Aufträge
                    </Button>
                    <Button 
                        onClick={() => router.push('/notes')} 
                        className="w-full"
                        disabled={profile?.status === 'inactive'}
                    >
                        <StickyNote className="mr-2 h-4 w-4" />
                        Notizen
                    </Button>
                     {isAdmin && (
                        <Button 
                            onClick={() => router.push('/admin/users')} 
                            className="w-full"
                            disabled={profile?.status === 'inactive'}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                        </Button>
                    )}
                </div>
                
                <div className="space-y-2 pt-2">
                  <Textarea 
                    placeholder="Sagen Sie dem Agenten, was Sie tun möchten..."
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAgentProcessing}
                  />
                  <Button onClick={handleAgentSubmit} className="w-full" disabled={isAgentProcessing || !agentInput.trim()}>
                    {isAgentProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    An Agenten senden
                  </Button>
                </div>
                
                {profile?.status === 'inactive' && (
                <Alert variant="destructive" className="text-left">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Konto inaktiv</AlertTitle>
                    <AlertDescription>
                    Ihr Konto wurde von einem Administrator gesperrt. Sie können nicht auf Ihre Notizen zugreifen.
                    </AlertDescription>
                </Alert>
                )}
                {isNoteOnlyUser && (
                <Alert variant="info" className="text-left">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Zugriff beschränkt</AlertTitle>
                    <AlertDescription>
                      Nur eigene Notizen zugelassen. Bitte beim Administrator qp@quapilot.com melden für weitere Funktionen.
                    </AlertDescription>
                </Alert>
                )}

                <div className="text-center pt-2">
                    <Button onClick={handleLogout} variant="secondary" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Ausloggen
                    </Button>
                    <p className="font-medium text-sm text-muted-foreground mt-1">{user.email}</p>
                </div>
            </div>
        </div>
         <div className="w-full max-w-md text-center mt-auto pb-2">
           <a href="https://www.quapilot.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
             www.quapilot.com
           </a>
        </div>
      </main>
    );
  }
  
  // State 3: No user is logged in, show the login form
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <Image src={logo} alt="QuaPilot Logo" width={48} height={48} className="h-12 w-12" />
            <h1 className="font-headline text-4xl font-bold tracking-tighter">
              QuaPilot® (qp)
            </h1>
          </div>
          <p className="text-muted-foreground">Loop-in Notizen und Stichproben</p>
        </div>
        <LoginForm />
      </div>
       <div className="absolute bottom-4 text-center">
           <a href="https://www.quapilot.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
             www.quapilot.com
           </a>
        </div>
    </main>
  );
}
