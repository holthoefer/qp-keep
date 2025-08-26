"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
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
import { getUserProfile } from "@/lib/actions";


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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setError("Please verify your email address before logging in.");
        setIsLoginLoading(false);
        return;
      }
      
      const profile = await getUserProfile(userCredential.user.uid);

      if (profile?.status === 'pending_approval') {
        router.push('/pending-approval');
        return;
      }

      if (profile?.status === 'suspended') {
        setError("Your account has been suspended. Please contact an administrator.");
        setIsLoginLoading(false);
        return;
      }

      toast({ title: "Success", description: "You are now logged in." });
      
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/notes');
      }

    } catch (err: any) {
      setError(err.message);
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

      const userDocRef = doc(db, "users", user.uid);
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
      
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: isAdmin ? 'admin' : 'user',
        status: isAdmin ? 'active' : 'pending_approval',
        createdAt: serverTimestamp(),
      });
      
      await sendEmailVerification(user);
      
      toast({ 
        title: "Verification Email Sent", 
        description: "Please check your inbox to verify your email. You will be redirected shortly.",
        duration: 10000,
      });

      if (isAdmin) {
        router.push('/notes');
      } else {
        router.push('/pending-approval');
      }

    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError("This email is already registered. Please try logging in.");
        } else {
            setError(err.message);
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
