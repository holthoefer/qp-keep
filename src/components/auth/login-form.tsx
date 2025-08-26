"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const ADMIN_EMAIL = "holthofer@gmail.com";

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoginLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The auth state listener in the layout will handle the redirect.
      router.push('/notes'); 
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsSignupLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
      
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: isAdmin ? 'admin' : 'user',
        status: isAdmin ? 'active' : 'pending_approval',
        createdAt: serverTimestamp(),
      });
      
      if (isAdmin) {
         toast({
            title: "Admin Account Created",
            description: "Welcome! Redirecting to your notes...",
         });
         // This is a reliable redirect after the admin user is created.
         router.push('/notes');
      } else {
        await sendEmailVerification(user);
        await signOut(auth);
        toast({ 
          title: "Account Created & Verification Sent", 
          description: "Please check your inbox. Your account is now pending administrator approval.",
          duration: 10000,
        });
        router.push('/pending-approval');
      }

    } catch (err: any) {
        console.error("Signup Error:", err);
        if (err.code === 'auth/email-already-in-use') {
            setError("This email is already registered. Please try logging in.");
        } else {
            setError("Failed to create account. " + err.message);
        }
    } finally {
      setIsSignupLoading(false);
    }
  };

  const isLoading = isLoginLoading || isSignupLoading;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-headline">Welcome</CardTitle>
        <CardDescription>Sign in or create an account to continue.</CardDescription>
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
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-2">
        <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
          {isLoginLoading && <Loader2 className="animate-spin" />}
          Sign In
        </Button>
        <Button onClick={handleSignup} className="w-full" variant="secondary" disabled={isLoading}>
          {isSignupLoading && <Loader2 className="animate-spin" />}
          Create Account
        </Button>
      </CardFooter>
    </Card>
  );
}
