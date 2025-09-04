import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Post } from '../models/post';

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

  createPost(data: { title: string; text: string; expiresAt?: string | null; sendTest?: boolean }): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, data);
  }

  updatePost(id: number, data: { title: string; text: string; expiresAt?: string | null; sendTest?: boolean }): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${id}`, data);
  }

  publishPost(id: number): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts/${id}/publish`, {});
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/posts/${id}`);
  }
}
