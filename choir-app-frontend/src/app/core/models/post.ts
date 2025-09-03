export interface Post {
  id: number;
  title: string;
  text: string;
  choirId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  author?: { id: number; name: string };
}
