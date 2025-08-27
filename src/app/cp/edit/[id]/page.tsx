
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getControlPlan, saveControlPlan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ControlPlanForm } from '@/components/cp/ControlPlanForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { ControlPlan } from '@/types';
import { useAuth } from '@/hooks/use-auth-context';

export default function EditControlPlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<ControlPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
        setLoading(false);
        setError("No control plan ID provided.");
        return;
    }
    
    getControlPlan(params.id)
      .then((plan) => {
        if (plan) {
          setInitialData(plan);
        } else {
          setError('Control Plan not found.');
          toast({
            title: 'Error',
            description: 'Control Plan not found.',
            variant: 'destructive',
          });
           router.push('/cp');
        }
      })
      .catch((err) => {
        console.error('Error fetching control plan:', err);
        setError('Failed to fetch control plan.');
        toast({
          title: 'Error',
          description: 'Failed to fetch control plan.',
          variant: 'destructive',
        });
        router.push('/cp');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id, toast, router]);

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
      router.push('/cp');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save the control plan.',
        variant: 'destructive',
      });
    }
  };
  
  const handleClose = () => {
    router.push('/cp');
  };

  if (loading) {
    return <LoadingScreen />;
  }
  
  if (error || !initialData) {
    // Error state is handled via toasts and redirects inside useEffect
    return <LoadingScreen />;
  }

  return (
    <ControlPlanForm
      onSubmit={handleFormSubmit}
      initialData={initialData}
      onClose={handleClose}
    />
  );
}
