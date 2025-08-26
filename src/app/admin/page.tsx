
'use client';

import { getAllUsers } from "@/lib/actions";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

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
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <UserManagementTable users={users} />
              )}
            </CardContent>
         </Card>
      </main>
    </div>
  );
}
