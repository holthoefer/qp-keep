'use client';

import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeepKnowLogo } from "@/components/icons";
import { LogOut } from "lucide-react";

export default function PendingApprovalPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    if (loading) {
        return null;
    }

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center justify-center space-y-4">
                    <KeepKnowLogo className="h-16 w-16 text-primary" />
                    <h1 className="font-headline text-5xl font-bold tracking-tighter">
                        Keep-Know
                    </h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Account Pending Approval</CardTitle>
                        <CardDescription>
                            Your account has been created successfully and is awaiting administrator approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>
                            You have successfully verified your email address. Before you can access your notes,
                            an administrator needs to review and activate your account.
                        </p>
                        <p>
                            You will be notified via email once your account is active. You can close this window.
                        </p>
                        <Button onClick={handleLogout} className="w-full">
                            <LogOut />
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
