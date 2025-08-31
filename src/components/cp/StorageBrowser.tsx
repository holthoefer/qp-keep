
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listStorageFiles } from '@/lib/data';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '../ui/scroll-area';
import type { StorageFile } from '@/types';


interface StorageBrowserProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImageSelect: (url: string) => void;
}

function StorageBrowserContent({ onImageSelect, onOpenChange }: { onImageSelect: (url: string) => void; onOpenChange: (isOpen: boolean) => void; }) {
  const [files, setFiles] = React.useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fileList = await listStorageFiles('uploads/');
        setFiles(fileList);
      } catch (e: any) {
        let errorMessage = e.message;
        if (e.code === 'storage/object-not-found') {
          errorMessage = "Das 'uploads/'-Verzeichnis existiert nicht oder ist leer. Bitte laden Sie zuerst ein Bild hoch.";
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const handleSelect = (url: string) => {
    onImageSelect(url);
    onOpenChange(false);
  }

  return (
      <ScrollArea className="h-[60vh] mt-4 pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                  <Skeleton className="h-32 w-full rounded-md" />
                  <Skeleton className="h-4 w-2/3" />
              </div>
              ))
          ) : error ? (
              <div className="col-span-full">
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Fehler beim Laden der Bilder</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                  </Alert>
              </div>
          ) : files.length === 0 ? (
               <div className="col-span-full text-center py-10 text-muted-foreground">
                  <ImageOff className="h-12 w-12 mx-auto mb-2" />
                  <p>Keine Bilder im Storage gefunden.</p>
               </div>
          ) : (
              files.map((file) => (
              <button
                  key={file.url}
                  onClick={() => handleSelect(file.url)}
                  className="group space-y-2 text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
              >
                  <div className="aspect-square w-full bg-muted rounded-md overflow-hidden group-hover:opacity-80 transition-opacity">
                  <Image
                      src={file.thumbnailUrl || file.url}
                      alt={file.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                  />
                  </div>
                  <p className="text-xs text-muted-foreground truncate" title={file.name}>
                  {file.name}
                  </p>
              </button>
              ))
          )}
          </div>
      </ScrollArea>
  );
}


export function StorageBrowser({
  isOpen,
  onOpenChange,
  onImageSelect,
}: StorageBrowserProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bilder aus Storage auswählen</DialogTitle>
          <DialogDescription>
            Klicken Sie auf ein Bild, um es auszuwählen.
          </DialogDescription>
        </DialogHeader>
        {isOpen && <StorageBrowserContent onImageSelect={onImageSelect} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}
