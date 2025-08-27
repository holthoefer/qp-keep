
'use server';

import { redirect } from 'next/navigation';
import { getControlPlan } from '@/lib/server-data';
import { saveControlPlan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ControlPlanForm } from '@/components/cp/ControlPlanForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { ControlPlan } from '@/types';
import { auth } from '@/lib/firebase';


// This is now a server component that fetches data and then passes it to the client component.
export default async function EditControlPlanPage({ params }: { params: { id: string } }) {
  const plan = await getControlPlan(params.id);

  if (!plan) {
    redirect('/cp');
  }

  const handleFormSubmit = async (data: ControlPlan) => {
    'use server';
    const user = auth.currentUser;
    if (!user) {
        // This case should ideally be handled by middleware or page-level checks
        throw new Error('Not authenticated');
    }
    try {
      await saveControlPlan(data, user.uid);
    } catch (error: any) {
      console.error('Error saving plan:', error);
      // In a server action, you might re-throw or return an error state
      throw new Error(error.message || 'Failed to save the control plan.');
    }
     // After saving, redirect on the client-side from within the form component
  };
  
  return (
    <ControlPlanForm
      onSubmit={handleFormSubmit}
      initialData={plan}
    />
  );
}
