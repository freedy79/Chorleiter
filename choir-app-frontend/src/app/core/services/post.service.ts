import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Post } from '../models/post';
import { Poll } from '../models/poll';
import { PostComment } from '../models/post-comment';
import { ReactionInfo, ReactionType } from '../models/reaction';

export type PostPayload = {
  title: string;
  text: string;
  expiresAt?: string | null;
  sendTest?: boolean;
  sendAsUser?: boolean;
  poll?: {
    options: string[];
    allowMultiple?: boolean;
    maxSelections?: number;
    closesAt?: string | null;
  } | null;
};

@Injectable({ providedIn: 'root' })
export class PostService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  getLatestPost(): Observable<Post | null> {
    return this.http.get<Post | null>(`${this.apiUrl}/posts/latest`);
  }

  createPost(data: PostPayload): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, data);
  }

  updatePost(id: number, data: PostPayload): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${id}`, data);
  }

  publishPost(id: number): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts/${id}/publish`, {});
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/posts/${id}`);
  }

  voteOnPost(id: number, optionIds: number[]): Observable<Poll> {
    return this.http.post<Poll>(`${this.apiUrl}/posts/${id}/vote`, { optionIds });
  }

  addComment(postId: number, text: string, parentId?: number | null): Observable<PostComment> {
    return this.http.post<PostComment>(`${this.apiUrl}/posts/${postId}/comments`, { text, parentId: parentId ?? null });
  }

  deleteComment(postId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${postId}/comments/${commentId}`);
  }

  reactToPost(postId: number, type?: ReactionType | null): Observable<ReactionInfo> {
    return this.http.post<ReactionInfo>(`${this.apiUrl}/posts/${postId}/reactions`, { type: type ?? null });
  }

  reactToComment(postId: number, commentId: number, type?: ReactionType | null): Observable<ReactionInfo> {
    return this.http.post<ReactionInfo>(`${this.apiUrl}/posts/${postId}/comments/${commentId}/reactions`, { type: type ?? null });
  }

  uploadAttachment(postId: number, file: File): Observable<Post> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Post>(`${this.apiUrl}/posts/${postId}/attachment`, formData);
  }

  removeAttachment(postId: number): Observable<Post> {
    return this.http.delete<Post>(`${this.apiUrl}/posts/${postId}/attachment`);
  }

  getAttachmentUrl(postId: number): string {
    return `${this.apiUrl}/posts/${postId}/attachment`;
  }
}
