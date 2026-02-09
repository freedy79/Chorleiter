import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { PostComment } from '@core/models/post-comment';
import { ReactionInfo, ReactionSummary, ReactionType } from '@core/models/reaction';
import { ApiService } from '@core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { PostPollComponent } from './post-poll.component';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, MarkdownPipe, PostPollComponent],
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent implements OnInit {
  @Input() post!: Post;
  @Input() currentUserId: number | null = null;
  @Input() isChoirAdmin = false;
  @Input() isAdmin = false;

  @Output() postEdited = new EventEmitter<Post>();
  @Output() postDeleted = new EventEmitter<number>();
  @Output() postPublished = new EventEmitter<number>();

  newCommentText: Record<number, string> = {};
  replyText: Record<number, string> = {};
  replyBoxOpen: Record<number, boolean> = {};
  commentFormOpen: Record<number, boolean> = {};

  reactionOptions: { type: ReactionType; label: string; emoji: string }[] = [
    { type: 'like', label: 'Gefällt mir', emoji: '👍' },
    { type: 'celebrate', label: 'Feiern', emoji: '🎉' },
    { type: 'support', label: 'Unterstützen', emoji: '🤝' },
    { type: 'love', label: 'Love', emoji: '❤️' },
    { type: 'insightful', label: 'Interessant', emoji: '💡' },
    { type: 'curious', label: 'Neugierig', emoji: '🤔' }
  ];

  constructor(
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.normalizePost();
  }

  canEdit(): boolean {
    return this.isChoirAdmin || this.post.userId === this.currentUserId;
  }

  canDeleteComment(comment: PostComment): boolean {
    return this.isAdmin || this.isChoirAdmin || comment.userId === this.currentUserId || this.post.userId === this.currentUserId;
  }

  publishPost(): void {
    this.api.publishPost(this.post.id).subscribe({
      next: () => {
        this.snackBar.open('Beitrag veröffentlicht', 'OK', { duration: 3000 });
        this.postPublished.emit(this.post.id);
      },
      error: () => this.snackBar.open('Fehler beim Veröffentlichen', 'Schließen', { duration: 4000 })
    });
  }

  deletePost(): void {
    this.postDeleted.emit(this.post.id);
  }

  editPost(): void {
    this.postEdited.emit(this.post);
  }

  setPostReaction(type?: ReactionType | null): void {
    this.api.reactToPost(this.post.id, type ?? null).subscribe({
      next: reactions => {
        this.post.reactions = this.ensureReactionInfo(reactions);
      },
      error: () => this.snackBar.open('Reaktion konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  setCommentReaction(comment: PostComment, type?: ReactionType | null): void {
    this.api.reactToComment(this.post.id, comment.id, type ?? null).subscribe({
      next: reactions => {
        comment.reactions = this.ensureReactionInfo(reactions);
      },
      error: () => this.snackBar.open('Reaktion konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  submitComment(parentId?: number | null): void {
    const targetKey = parentId ?? this.post.id;
    const store = parentId ? this.replyText : this.newCommentText;
    const text = (store[targetKey] || '').trim();
    if (!text) {
      this.snackBar.open('Bitte einen Kommentar eingeben', 'Schließen', { duration: 3000 });
      return;
    }
    this.api.addPostComment(this.post.id, text, parentId ?? null).subscribe({
      next: comment => {
        this.addCommentToPost(comment);
        store[targetKey] = '';
        if (parentId) {
          this.replyBoxOpen[parentId] = false;
        }
      },
      error: () => this.snackBar.open('Kommentar konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  deleteComment(commentId: number): void {
    this.api.deletePostComment(this.post.id, commentId).subscribe({
      next: () => {
        this.removeCommentFromPost(commentId);
        this.snackBar.open('Kommentar gelöscht', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Kommentar konnte nicht gelöscht werden', 'Schließen', { duration: 4000 })
    });
  }

  toggleReplyBox(commentId: number): void {
    this.replyBoxOpen[commentId] = !this.replyBoxOpen[commentId];
  }

  toggleCommentForm(): void {
    this.commentFormOpen[this.post.id] = !this.commentFormOpen[this.post.id];
    if (this.commentFormOpen[this.post.id]) {
      setTimeout(() => document.getElementById(`comment-input-${this.post.id}`)?.focus(), 0);
    }
  }

  reactionIcon(type?: ReactionType | null): string {
    const option = this.reactionOptions.find(o => o.type === type);
    return option?.emoji || '👍';
  }

  reactionLabel(type?: ReactionType | null): string {
    if (!type) return 'Reagieren';
    return this.reactionOptions.find(o => o.type === type)?.label || 'Reagieren';
  }

  getAttachmentUrl(): string {
    return this.api.getPostAttachmentUrl(this.post.id);
  }

  countComments(comments?: PostComment[]): number {
    if (!comments) return 0;
    return comments.reduce((sum, comment) => sum + 1 + this.countComments(comment.replies), 0);
  }

  reactionSummaries(info?: ReactionInfo | null): ReactionSummary[] {
    if (!info) return [];
    return Array.isArray(info.summary) ? info.summary : [];
  }

  onPollChange(poll: Post['poll']): void {
    this.post.poll = poll;
  }

  private normalizePost(): void {
    this.post = {
      ...this.post,
      reactions: this.ensureReactionInfo(this.post.reactions),
      comments: this.normalizeComments(this.post.comments || [])
    };
  }

  private normalizeComments(comments: PostComment[]): PostComment[] {
    return (comments || []).map(comment => this.normalizeComment(comment));
  }

  private normalizeComment(comment: PostComment): PostComment {
    return {
      ...comment,
      reactions: this.ensureReactionInfo(comment.reactions),
      replies: this.normalizeComments(comment.replies || [])
    };
  }

  private ensureReactionInfo(info?: ReactionInfo): ReactionInfo {
    return info ?? { summary: [], total: 0, userReaction: null };
  }

  private addCommentToPost(comment: PostComment): void {
    const normalized = this.normalizeComment(comment);
    if (normalized.parentId) {
      const parent = this.findComment(this.post.comments || [], normalized.parentId);
      if (parent) {
        parent.replies = [...(parent.replies || []), normalized];
      }
    } else {
      this.post.comments = [...(this.post.comments || []), normalized];
    }
  }

  private removeCommentFromPost(commentId: number): void {
    if (!this.post.comments) return;
    this.post.comments = this.removeCommentRecursive(this.post.comments, commentId);
  }

  private removeCommentRecursive(list: PostComment[], commentId: number): PostComment[] {
    return list
      .filter(comment => comment.id !== commentId)
      .map(comment => ({
        ...comment,
        replies: this.removeCommentRecursive(comment.replies || [], commentId)
      }));
  }

  private findComment(list: PostComment[] | undefined, id: number): PostComment | undefined {
    for (const comment of list || []) {
      if (comment.id === id) return comment;
      const child = this.findComment(comment.replies || [], id);
      if (child) return child;
    }
    return undefined;
  }
}
