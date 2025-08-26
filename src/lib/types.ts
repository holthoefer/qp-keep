export interface Note {
  id: string;
  userId: string; 
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface UserProfile {
  id: string; // This will be the UID from Firebase Auth
  uid: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending_approval' | 'suspended';
  createdAt: string; // ISO string
}
