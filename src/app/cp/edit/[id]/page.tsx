
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveControlPlan, getControlPlan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ControlPlanForm } from '@/components/cp/ControlPlanForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { ControlPlan } from '@/types';
import { useAuth } from '@/hooks/use-auth-context';


export default function EditControlPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<ControlPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = params;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/');
        return;
    }

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const plan = await getControlPlan(id);
            if (plan) {
                setInitialData(plan);
            } else {
                setError('Control plan not found.');
                toast({ title: 'Error', description: 'Control plan not found.', variant: 'destructive' });
                router.push('/cp');
            }
        } catch (err: any) {
            console.error('Error fetching plan:', err);
            setError(err.message || 'Failed to load control plan.');
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    fetchPlan();
  }, [id, router, toast, user, authLoading]);

  const handleFormSubmit = async (data: ControlPlan) => {
    if (!user) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
    }
    try {
      await saveControlPlan(data, user.uid);
      toast({
        title: 'Control Plan Updated',
        description: `Plan for ${data.partName} has been saved.`,
      });
      // Redirect on the client-side after saving
      router.push('/cp'); 
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save the control plan.',
        variant: 'destructive',
      });
    }
  };

  if (loading || authLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-destructive">{error}</p>
        </div>
    );
  }
  
  return (
    <ControlPlanForm
      onSubmit={handleFormSubmit}
      initialData={initialData}
    />
  );
}
