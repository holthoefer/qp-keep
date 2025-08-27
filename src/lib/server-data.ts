
import { db } from './firebase';
import {
  doc,
  getDoc,
} from 'firebase/firestore';
import type { ControlPlan } from '@/types';

export async function getControlPlan(id: string): Promise<ControlPlan | null> {
    const docRef = doc(db, 'control-plans', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ControlPlan;
    }
    return null;
}
