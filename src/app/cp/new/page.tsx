
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveControlPlan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ControlPlanForm } from '@/components/cp/ControlPlanForm';
import type { ControlPlan } from '@/types';
import { useAuth } from '@/hooks/use-auth-context';

export default function NewControlPlanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<ControlPlan | null | undefined>(undefined);

  useEffect(() => {
    const duplicatedPlanJson = sessionStorage.getItem('duplicatedPlan');
    if (duplicatedPlanJson) {
      try {
        const duplicatedPlan = JSON.parse(duplicatedPlanJson);
        setInitialData(duplicatedPlan);
      } catch (error) {
        console.error("Failed to parse duplicated plan from session storage", error);
        setInitialData(null);
      } finally {
        sessionStorage.removeItem('duplicatedPlan');
      }
    } else {
        setInitialData(null); // Explicitly set to null to indicate we are creating a new one
    }
  }, []);


  const handleFormSubmit = async (data: Omit<ControlPlan, 'id'>) => {
    if (!user) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
    }
    try {
      await saveControlPlan(data, user.uid);
      toast({
        title: 'Control Plan Created',
        description: `Plan for ${data.partName} has been saved.`,
      });
      router.push('/cp');
      router.refresh();
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

  // Render a loading state until we've checked session storage
  if (initialData === undefined) {
    return null;
  }

  return (
    <ControlPlanForm
      onSubmit={handleFormSubmit}
      initialData={initialData}
      onClose={handleClose}
    />
  );
}
