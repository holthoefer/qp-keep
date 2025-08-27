
'use client';

import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
            <div className="flex items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg font-medium text-muted-foreground">Verbindung wird hergestellt...</p>
            </div>
        </div>
    );
}
