

'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Book, Target, LayoutGrid, FolderKanban, Network, LogOut, FileImage, RefreshCw, MoreVertical, Wrench, StickyNote, Siren, ArrowLeft } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import logo from '../Logo.png';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageModal } from '@/components/cp/ImageModal';
import { Copy } from 'lucide-react';

const PAGE_SIZE = 25;

export default function StorageViewerPage() {
  const { user, loading: authLoading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [allFiles, setAllFiles] = React.useState<StorageFile[]>([]);
  const [visibleFiles, setVisibleFiles] = React.useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalImageUrl, setModalImageUrl] = React.useState('');
  const [modalImageAlt, setModalImageAlt] = React.useState('');

  const fetchData = React.useCallback(async () => {
    setLoadingFiles(true);
    try {
      const filesFromDb = await listStorageFiles('uploads/');
      filesFromDb.sort((a, b) => a.name.localeCompare(b.name));
      setAllFiles(filesFromDb);
      setVisibleFiles(filesFromDb.slice(0, PAGE_SIZE));
      setPage(1);
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
  
  const handleLoadMore = () => {
    const nextPage = page + 1;
    const newVisibleFiles = allFiles.slice(0, nextPage * PAGE_SIZE);
    setVisibleFiles(newVisibleFiles);
    setPage(nextPage);
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const hasMoreFiles = visibleFiles.length < allFiles.length;

  if (authLoading) {
    return null; // AuthProvider shows loading screen
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL kopiert!' });
  };
  
  const handleImageClick = (file: StorageFile) => {
    setModalImageUrl(file.url);
    setModalImageAlt(file.name);
    setIsModalOpen(true);
  }

  return (
    <>
    <ImageModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        imageUrl={modalImageUrl}
        imageAlt={modalImageAlt}
      />
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="qp Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="font-headline text-xl font-bold tracking-tighter text-foreground">
            qp
          </h1>
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
        <Card className="mx-auto w-full max-w-7xl">
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => router.push('/admin/users')} className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                         <div>
                            <CardTitle>Firebase Storage Dateien</CardTitle>
                            <CardDescription>Übersicht aller Originalbilder und der generierten Thumbnails.</CardDescription>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Neu laden
                        </Button>
                     </div>
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
                 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {loadingFiles ? (
                        Array.from({ length: 10 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-0">
                                    <Skeleton className="w-full h-32 rounded-t-lg" />
                                </CardContent>
                                <CardFooter className="p-2 flex-col items-start">
                                    <Skeleton className="h-4 w-full mt-1" />
                                </CardFooter>
                            </Card>
                        ))
                    ) : visibleFiles.length === 0 ? (
                        <div className="col-span-full text-center py-10">
                            <p className="text-muted-foreground">Keine Dateien gefunden.</p>
                        </div>
                    ) : (
                        visibleFiles.map((file) => (
                            <Card key={file.url} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <button onClick={() => handleImageClick(file)} className="block w-full aspect-square relative bg-muted hover:opacity-80 transition-opacity">
                                        <Image 
                                            src={file.thumbnailUrl || file.url} 
                                            alt={`Thumbnail für ${file.name}`} 
                                            fill 
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                            className="object-cover"
                                        />
                                    </button>
                                </CardContent>
                                <CardFooter className="p-2 flex-col items-start">
                                    <p className="text-xs font-medium truncate w-full" title={file.name}>
                                        {file.name.split('/').pop()}
                                    </p>
                                    <Button size="xs" variant="ghost" className="h-6 px-1 w-full justify-start text-muted-foreground" onClick={() => handleCopyUrl(file.url)}>
                                        <Copy className="h-3 w-3 mr-1"/> Original-URL kopieren
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                 </div>
                {hasMoreFiles && (
                    <div className="pt-4 text-center">
                        <Button onClick={handleLoadMore} variant="secondary">
                            Mehr laden
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
    </>
  );
}
