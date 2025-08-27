
'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, updateUser, type UserProfile } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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

export default function UserManagementPage() {
  const { user, loading: authLoading, logout } = useAuth();
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
          <KeepKnowLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold tracking-tighter text-foreground">
            Admin: Benutzer
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                Zurück zu Notizen
            </Button>
            <Button onClick={handleLogout} variant="secondary">
                Ausloggen
            </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl">
            <h2 className="mb-4 font-headline text-2xl font-semibold">Benutzerliste</h2>
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
                                         <Select
                                            value={u.status}
                                            onValueChange={(value: 'active' | 'inactive') => handleStatusChange(u.uid, value)}
                                            disabled={u.uid === user?.uid}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">
                                                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                                </SelectItem>
                                                <SelectItem value="inactive">
                                                    <Badge variant="destructive">Inactive</Badge>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
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
