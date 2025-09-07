

'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, updateUser, type UserProfile } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, ArrowLeft, Shield, FileImage, Book, FolderKanban, LayoutGrid, Network, Siren, StickyNote, Target, Wrench, MoreVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import logo from '../../Logo.png';
import Link from 'next/link';


export default function UserManagementPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoadingUsers(true);
    getAllUsers()
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(`Fehler beim Laden der Benutzer: ${err.message}`);
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  }, []);

  const handleRoleChange = async (uid: string, role: 'admin' | 'user') => {
    try {
      await updateUser(uid, { role });
      setUsers(users.map(u => u.uid === uid ? { ...u, role } : u));
      toast({
        title: 'Rolle aktualisiert',
        description: `Die Rolle des Benutzers wurde auf ${role} geändert.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Fehler',
        description: 'Die Benutzerrolle konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (uid: string, status: 'active' | 'inactive') => {
    try {
      await updateUser(uid, { status });
      setUsers(users.map(u => u.uid === uid ? { ...u, status } : u));
      toast({
        title: 'Status aktualisiert',
        description: `Der Status des Benutzers wurde auf ${status} geändert.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Fehler',
        description: 'Der Benutzerstatus konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    }
  };
  
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (authLoading) {
    return null; // AuthProvider shows loading screen
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
            <Link href="/" aria-label="Zur Startseite">
              <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
            </Link>
            {/* Desktop View: Full Buttons */}
            <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    WP
                </Button>
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
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                    </Button>
                )}
            </div>
             {/* Mobile View: Icons and Dropdown */}
            <div className="md:hidden flex items-center gap-1">
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/arbeitsplaetze')}>
                    <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/dna')}>
                    <Network className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/PO')}>
                    <FolderKanban className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/notes')}>
                    <StickyNote className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/events')}>
                    <Wrench className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/incidents')}>
                    <Siren className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                        <DropdownMenuItem onClick={() => router.push('/admin/users')}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin</span>
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="mx-auto w-full max-w-6xl">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => router.push('/notes')} className="h-8 w-8">
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="font-headline text-2xl font-semibold">Admin: Benutzerliste</h2>
              </div>
              {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/storage')}>
                    <FileImage className="mr-2 h-4 w-4" />
                    Storage
                  </Button>
              )}
            </div>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registriert am</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingUsers ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => (
                                <TableRow key={u.uid}>
                                    <TableCell className="font-medium">{u.email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={u.role}
                                            onValueChange={(value: 'admin' | 'user') => handleRoleChange(u.uid, value)}
                                            disabled={u.uid === user?.uid}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className={u.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                {u.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <Select
                                                value={u.status}
                                                onValueChange={(value: 'active' | 'inactive') => handleStatusChange(u.uid, value)}
                                                disabled={u.uid === user?.uid}
                                            >
                                                <SelectTrigger className="w-[100px] ml-2 h-8">
                                                    <SelectValue placeholder="Status ändern" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell>{u.createdAt?.toDate().toLocaleDateString('de-DE')}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </main>
    </div>
  );
}
