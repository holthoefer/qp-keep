
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


export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const { toast } = useToast();
  const { loginWithEmail, signupWithEmail } = useAuth();


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

  const isLoading = isLoginLoading || isSignupLoading;

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
      <CardFooter className="flex-col space-y-2">
        <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
          {isLoginLoading && <Loader2 className="animate-spin mr-2" />}
          Anmelden
        </Button>
        <Button onClick={handleSignup} className="w-full" variant="secondary" disabled={isLoading}>
          {isSignupLoading && <Loader2 className="animate-spin mr-2" />}
          Konto erstellen
        </Button>
      </CardFooter>
    </Card>
  );
}
