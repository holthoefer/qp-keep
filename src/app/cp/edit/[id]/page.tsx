
'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!params.id) {
        setLoading(false);
        return;
    }
    
    getControlPlan(params.id)
      .then((plan) => {
        if (plan) {
          setInitialData(plan);
        } else {
          toast({
            title: 'Error',
            description: 'Control Plan not found.',
            variant: 'destructive',
          });
          router.push('/cp');
        }
      })
      .catch((error) => {
        console.error('Error fetching control plan:', error);
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
  }, [params.id, router, toast]);

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
      router.refresh(); // To force a refetch on the overview page
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
  
  if (!initialData) {
    // This state is briefly hit before redirecting. Can show a loader or a message.
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
