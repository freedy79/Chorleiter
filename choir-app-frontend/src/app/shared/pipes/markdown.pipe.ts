import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ApiService } from '@core/services/api.service';
import { Piece } from '@core/models/piece';
import { forkJoin, map, Observable, of } from 'rxjs';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private pieceCache = new Map<number, string>();
  private sanitizer = inject(DomSanitizer);
  private api = inject(ApiService);

  transform(value: string): Observable<SafeHtml> {
    if (!value) return of('');

    const ids = Array.from(new Set(Array.from(value.matchAll(/\{\{(\d+)\}\}/g)).map(m => +m[1])));
    const missing = ids.filter(id => !this.pieceCache.has(id));
    const pieces$ = missing.length ? forkJoin(missing.map(id => this.api.getPieceById(id))) : of<Piece[]>([]);

    return pieces$.pipe(
      map((pieces: Piece[]) => {
        pieces.forEach(p => this.pieceCache.set(p.id, p.title));
        const replaced = value.replace(/\{\{(\d+)\}\}/g, (match, id) => {
          const title = this.pieceCache.get(+id);
          return title ? `[${title}](/pieces/${id})` : match;
        });
        const html = marked.parse(replaced) as string;
        const sanitized = DOMPurify.sanitize(html);
        return this.sanitizer.bypassSecurityTrustHtml(sanitized);
      })
    );
  }
}
