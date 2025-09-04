export interface Post {
  id: number;
  title: string;
  text: string;
  choirId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  published: boolean;
  author?: { id: number; name: string };
  sendAsUser?: boolean;
}
