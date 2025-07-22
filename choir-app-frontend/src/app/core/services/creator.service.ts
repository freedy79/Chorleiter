import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export abstract class CreatorService<T> {
  protected apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient, private endpoint: string) {}

  protected url(id?: number, force = false): string {
    const base = `${this.apiUrl}/${this.endpoint}` + (id ? `/${id}` : '');
    return force ? `${base}?force=true` : base;
  }

  getAll(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiUrl}/${this.endpoint}`);
  }

  create(data: any, force = false): Observable<T> {
    return this.http.post<T>(this.url(undefined, force), data);
  }

  update(id: number, data: any, force = false): Observable<T> {
    return this.http.put<T>(this.url(id, force), data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(this.url(id));
  }

  enrich(id: number): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${this.endpoint}/${id}/enrich`, {});
  }
}
