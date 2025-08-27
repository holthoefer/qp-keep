
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageAlt: string;
}

export function ImageModal({
  isOpen,
  onOpenChange,
  imageUrl,
  imageAlt,
}: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bildvorschau</DialogTitle>
        </DialogHeader>
        <div className="flex-grow relative">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-contain"
            data-ai-hint="order image"
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Schließen
            </Button>
          </DialogClose>
          <Button asChild variant="outline">
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              In neuem Tab öffnen
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
