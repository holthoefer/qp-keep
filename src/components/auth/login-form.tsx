
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth-context";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path
            d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.62-4.8 1.62-3.87 0-7.02-3.15-7.02-7.02s3.15-7.02 7.02-7.02c2.2 0 3.68.88 4.54 1.72l2.16-2.16C18.2 1.15 15.66 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c7.2 0 12.04-4.74 12.04-12.04 0-.8-.08-1.54-.2-2.32H12.48z"
            fill="currentColor"
        />
    </svg>
);


export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();


  const handleLogin = async () => {
    setIsLoginLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      // Auth state change is handled by the AuthProvider
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Ungültige E-Mail oder Passwort. Bitte versuchen Sie es erneut.");
      } else {
        setError("Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
      setIsLoginLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsSignupLoading(true);
    setError(null);
    try {
      await signupWithEmail(email, password);
      
      toast({ 
        title: "Konto erstellt", 
        description: "Bitte überprüfen Sie Ihren Posteingang, um Ihre E-Mail zu bestätigen.",
        duration: 10000,
      });

      // Auth state change is handled by the AuthProvider
    } catch (err: any) {
        console.error("Signup Error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError("Diese E-Mail ist bereits registriert. Bitte versuchen Sie, sich anzumelden.");
        } else {
            setError("Konto konnte nicht erstellt werden. " + err.message);
        }
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
        await loginWithGoogle();
        // Auth state change is handled by the AuthProvider
    } catch (err: any) {
        console.error("Google Login Error:", err);
        setError("Anmeldung mit Google fehlgeschlagen. " + err.message);
    } finally {
        setIsGoogleLoading(false);
    }
  };

  const isLoading = isLoginLoading || isSignupLoading || isGoogleLoading;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-headline">Willkommen</CardTitle>
        <CardDescription>Melden Sie sich an oder erstellen Sie ein Konto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-4">
        <div className="w-full space-y-2">
            <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                {isLoginLoading && <Loader2 className="animate-spin mr-2" />}
                Anmelden
            </Button>
            <Button onClick={handleSignup} className="w-full" variant="secondary" disabled={isLoading}>
                {isSignupLoading && <Loader2 className="animate-spin mr-2" />}
                Konto erstellen
            </Button>
        </div>
        <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                    Oder
                </span>
            </div>
        </div>
        <Button onClick={handleGoogleLogin} className="w-full" variant="outline" disabled={isLoading}>
            {isGoogleLoading ? (
                <Loader2 className="animate-spin mr-2" />
            ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Mit Google anmelden
        </Button>
      </CardFooter>
    </Card>
  );
}
