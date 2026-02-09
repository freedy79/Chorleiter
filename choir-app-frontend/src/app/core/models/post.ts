import { Poll } from './poll';
import { PostComment } from './post-comment';
import { ReactionInfo } from './reaction';

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
  attachmentOriginalName?: string | null;
  poll?: Poll | null;
  reactions?: ReactionInfo;
  comments?: PostComment[];
}
