
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { KeepKnowLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Book, Target, LayoutGrid, FolderKanban, BrainCircuit, LogOut, FileImage, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { listStorageFiles, type StorageFile } from '@/lib/data';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StorageViewerPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [files, setFiles] = React.useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    setLoadingFiles(true);
    try {
      const allFiles = await listStorageFiles('uploads/');
      // Sort files alphabetically by name
      allFiles.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(allFiles);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(`Fehler beim Laden der Dateien: ${err.message}`);
      toast({
        title: 'Fehler',
        description: `Dateien konnten nicht geladen werden: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoadingFiles(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            Storage Viewer
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/notes')}>
                Notizen
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/arbeitsplaetze')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                WP
            </Button>
             <Button variant="outline" size="sm" onClick={() => router.push('/dna')}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                DNA
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/auftraege')}>
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
        <Card className="mx-auto w-full max-w-7xl">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Firebase Storage Dateien</CardTitle>
                        <CardDescription>Übersicht aller Originalbilder und der generierten Thumbnails.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Neu laden
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Fehler</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                )}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Thumbnail</TableHead>
                            <TableHead>Original</TableHead>
                            <TableHead>Thumbnail URL</TableHead>
                            <TableHead>Original URL</TableHead>
                            <TableHead>Dateiname</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingFiles ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : files.length === 0 ? (
                                 <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Keine Dateien im 'uploads/' Verzeichnis gefunden.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                files.map((file) => (
                                    <TableRow key={file.url}>
                                        <TableCell>
                                            {file.thumbnailUrl ? (
                                                <Image src={file.thumbnailUrl} alt={`Thumbnail für ${file.name}`} width={64} height={64} className="rounded object-cover aspect-square" />
                                            ) : (
                                                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No thumb</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Image src={file.url} alt={file.name} width={64} height={64} className="rounded object-cover aspect-square" />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground break-all max-w-xs font-mono">{file.thumbnailUrl || 'N/A'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground break-all max-w-xs font-mono">{file.url}</TableCell>
                                        <TableCell className="font-medium text-xs">{file.name}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
