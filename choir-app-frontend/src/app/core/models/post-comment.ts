import { ReactionInfo } from './reaction';

export interface PostComment {
  id: number;
  text: string;
  postId: number;
  choirId: number;
  parentId?: number | null;
  userId: number;
  author?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  reactions?: ReactionInfo;
  replies?: PostComment[];
}
