
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,35.619,44,29.563,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const { toast } = useToast();
  const { loginWithEmail, signupWithEmail, loginWithGoogle, sendPasswordReset } = useAuth();


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

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Bitte geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.");
      return;
    }
    setIsResetLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      toast({
        title: "E-Mail zum Zurücksetzen gesendet",
        description: "Bitte überprüfen Sie Ihren Posteingang für weitere Anweisungen.",
        duration: 10000,
      });
    } catch (err: any) {
      setError("Fehler beim Senden der E-Mail zum Zurücksetzen des Passworts. " + err.message);
    } finally {
      setIsResetLoading(false);
    }
  };


  const isLoading = isLoginLoading || isSignupLoading || isGoogleLoading || isResetLoading;

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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Passwort</Label>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isLoading}
              className="text-xs font-medium text-primary hover:underline focus:outline-none"
            >
              Passwort vergessen?
            </button>
          </div>
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
