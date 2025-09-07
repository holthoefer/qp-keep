
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import logo from '../Logo.png';

export default function QPInfoPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-background p-4">
      <div className="absolute top-4 left-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center flex-grow">
        <Card className="w-full max-w-2xl">
          <CardHeader className="items-center text-center">
            <a href="https://www.quapilot.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                www.quapilot.com
            </a>
            <Image src={logo} alt="QuaPilot Logo" width={128} height={128} className="h-32 w-32 mb-4" />
            <CardTitle className="text-3xl">QuaPilot<sup>&reg;</sup> (qp)</CardTitle>
            <CardDescription>Loop-in Notizen und Stichproben</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>
              Willkommen bei QuaPilot. Diese Seite kann zukünftig für Release-Informationen, Anleitungen oder allgemeine Informationen zur Anwendung genutzt werden.
            </p>
            <p className="text-sm text-muted-foreground">
              Version 1.0.0
            </p>
          </CardContent>
          <CardFooter className="justify-center pt-4">
              <p className="text-xs text-muted-foreground">
                QuaPilot<sup>&reg;</sup> ist eine in der Schweiz registrierte Marke.
              </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
