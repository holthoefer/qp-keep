
'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This page is now obsolete. We redirect any traffic here to the new dashboard.
export default function PendingApprovalPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    return null;
}
