export interface Note {
  id: string;
  userId: string; // Add userId to associate note with a user
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
