import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ApiService } from '@core/services/api.service';
import { Piece } from '@core/models/piece';
import { forkJoin, map, Observable, of } from 'rxjs';

type MentionCandidate = {
  id: number;
  displayName: string;
};

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private pieceCache = new Map<number, string>();
  private sanitizer = inject(DomSanitizer);
  private api = inject(ApiService);

  transform(value: string, mentionCandidates: MentionCandidate[] = []): Observable<SafeHtml> {
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
        const withMentions = this.replaceMentionsWithLinks(replaced, mentionCandidates);
        const html = marked.parse(withMentions) as string;
        const sanitized = DOMPurify.sanitize(html, {
          ADD_TAGS: ['img'],
          ADD_ATTR: ['src', 'alt', 'width', 'height', 'loading'],
          // Also allows in-app links (/pieces/1, #anchor, ?q=x) while rejecting protocol-relative //host.
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|mention):|\/(?!\/)|[#?])/i,
        });
        return this.sanitizer.bypassSecurityTrustHtml(sanitized);
      })
    );
  }

  private replaceMentionsWithLinks(text: string, candidates: MentionCandidate[]): string {
    const normalizedCandidates = (candidates || [])
      .filter(c => Number.isInteger(c.id) && c.id > 0 && !!c.displayName?.trim())
      .map(c => ({ id: c.id, displayName: c.displayName.trim() }));

    if (!normalizedCandidates.length) return text;

    const uniqueByName = new Map<string, MentionCandidate>();
    for (const candidate of normalizedCandidates) {
      const key = candidate.displayName.toLocaleLowerCase('de');
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, candidate);
      }
    }

    const names = Array.from(uniqueByName.values())
      .map(c => c.displayName)
      .sort((a, b) => b.length - a.length);

    if (!names.length) return text;

    const escapedAlternatives = names
      .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const mentionRegex = new RegExp(
      `(^|[\\s([{\"'„‚»«])(${escapedAlternatives})(?=$|[\\s)\\]}\"'’.,!?:;„“”«»])`,
      'gim'
    );

    return text.replace(mentionRegex, (fullMatch, prefix: string, nameMatch: string) => {
      const candidate = uniqueByName.get(String(nameMatch).toLocaleLowerCase('de'));
      if (!candidate) return fullMatch;
      return `${prefix}[${nameMatch}](mention://${candidate.id})`;
    });
  }
}
