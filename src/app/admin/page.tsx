
'use client';

import { getAllUsers } from "@/lib/actions";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  // This page is temporarily disabled while fixing core profile loading.
  // const allUsers = await getAllUsers();
  const allUsers = [];
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between p-4 md:p-6">
        <div>
         <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">Admin Panel</h1>
         <p className="text-muted-foreground">Manage users and their permissions.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
        </Button>
      </header>
      <main className="flex-grow p-4 md:p-6 pt-0">
         <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Update roles and statuses for all users in the system.</CardDescription>
            </CardHeader>
            {/* <UserManagementTable users={allUsers} /> */}
             <div className="p-6 pt-0 text-center text-muted-foreground">
                User management is temporarily disabled.
            </div>
         </Card>
      </main>
    </div>
  );
}
