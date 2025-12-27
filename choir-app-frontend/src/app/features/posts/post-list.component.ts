import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Post } from '@core/models/post';
import { PostComment } from '@core/models/post-comment';
import { ReactionInfo, ReactionType } from '@core/models/reaction';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { PostDialogComponent } from './post-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { PostPollComponent } from './post-poll.component';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, MarkdownPipe, PostPollComponent],
  templateUrl: './post-list.component.html'
})
export class PostListComponent implements OnInit {
  posts: Post[] = [];
  displayCount = 5;
  currentUserId: number | null = null;
  isChoirAdmin = false;
  isAdmin = false;
  isDirector = false;
  reactionOptions: { type: ReactionType; label: string; emoji: string }[] = [
    { type: 'like', label: 'Gefällt mir', emoji: '👍' },
    { type: 'celebrate', label: 'Feiern', emoji: '🎉' },
    { type: 'support', label: 'Unterstützen', emoji: '🤝' },
    { type: 'love', label: 'Love', emoji: '❤️' },
    { type: 'insightful', label: 'Interessant', emoji: '💡' },
    { type: 'curious', label: 'Neugierig', emoji: '🤔' }
  ];
  newCommentText: Record<number, string> = {};
  replyText: Record<number, string> = {};
  replyBoxOpen: Record<number, boolean> = {};
  constructor(
    private api: ApiService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.loadPosts();
    this.auth.currentUser$.subscribe(u => this.currentUserId = u?.id || null);
    this.auth.isAdmin$.subscribe(isAdmin => this.isAdmin = isAdmin);
    this.auth.isChoirAdmin$.subscribe(isChoirAdmin => this.isChoirAdmin = isChoirAdmin);
    this.auth.isDirector$.subscribe(isDirector => this.isDirector = isDirector);
  }

  loadPosts(): void {
    this.api.getPosts().subscribe(p => {
      this.posts = p.map(post => this.normalizePost(post));
      this.newCommentText = {};
      this.replyText = {};
      this.replyBoxOpen = {};
      this.displayCount = Math.min(5, this.posts.length);
      const fragment = this.route.snapshot.fragment;
      if (fragment) {
        setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' }), 0);
      }
    });
  }

  showMore(): void {
    this.displayCount = Math.min(this.displayCount + 5, this.posts.length);
  }

  canEdit(post: Post): boolean {
    return this.isChoirAdmin || post.userId === this.currentUserId;
  }

  addPost(): void {
    const ref = this.dialog.open(PostDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(result => {
      if (result === 'created') {
        this.snackBar.open('Beitrag erstellt', 'OK', { duration: 3000 });
        this.loadPosts();
      }
    });
  }

  editPost(post: Post): void {
    const ref = this.dialog.open(PostDialogComponent, { width: '600px', data: { post } });
    ref.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.snackBar.open('Beitrag aktualisiert', 'OK', { duration: 3000 });
        this.loadPosts();
      }
    });
  }

  publishPost(post: Post): void {
    this.api.publishPost(post.id).subscribe({
      next: () => { this.snackBar.open('Beitrag veröffentlicht', 'OK', { duration: 3000 }); this.loadPosts(); },
      error: () => this.snackBar.open('Fehler beim Veröffentlichen', 'Schließen', { duration: 4000 })
    });
  }

  deletePost(post: Post): void {
    const data: ConfirmDialogData = { title: 'Beitrag löschen?', message: 'Möchten Sie diesen Beitrag wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.api.deletePost(post.id).subscribe({
          next: () => { this.snackBar.open('Beitrag gelöscht', 'OK', { duration: 3000 }); this.loadPosts(); },
          error: () => this.snackBar.open('Fehler beim Löschen', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  onPollChange(post: Post, poll: Post['poll']): void {
    post.poll = poll;
  }

  setPostReaction(post: Post, type?: ReactionType | null): void {
    this.api.reactToPost(post.id, type ?? null).subscribe({
      next: reactions => { post.reactions = this.ensureReactionInfo(reactions); },
      error: () => this.snackBar.open('Reaktion konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  setCommentReaction(post: Post, comment: PostComment, type?: ReactionType | null): void {
    this.api.reactToComment(post.id, comment.id, type ?? null).subscribe({
      next: reactions => { comment.reactions = this.ensureReactionInfo(reactions); },
      error: () => this.snackBar.open('Reaktion konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  submitComment(postId: number, parentId?: number | null): void {
    const targetKey = parentId ?? postId;
    const store = parentId ? this.replyText : this.newCommentText;
    const text = (store[targetKey] || '').trim();
    if (!text) {
      this.snackBar.open('Bitte einen Kommentar eingeben', 'Schließen', { duration: 3000 });
      return;
    }
    this.api.addPostComment(postId, text, parentId ?? null).subscribe({
      next: comment => {
        this.addCommentToPost(postId, comment);
        store[targetKey] = '';
        if (parentId) {
          this.replyBoxOpen[parentId] = false;
        }
      },
      error: () => this.snackBar.open('Kommentar konnte nicht gespeichert werden', 'Schließen', { duration: 4000 })
    });
  }

  deleteComment(postId: number, commentId: number): void {
    this.api.deletePostComment(postId, commentId).subscribe({
      next: () => {
        this.removeCommentFromPost(postId, commentId);
        this.snackBar.open('Kommentar gelöscht', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Kommentar konnte nicht gelöscht werden', 'Schließen', { duration: 4000 })
    });
  }

  canDeleteComment(comment: PostComment, post: Post): boolean {
    return this.isAdmin || this.isChoirAdmin || comment.userId === this.currentUserId || post.userId === this.currentUserId;
  }

  toggleReplyBox(commentId: number): void {
    this.replyBoxOpen[commentId] = !this.replyBoxOpen[commentId];
  }

  reactionIcon(type?: ReactionType | null): string {
    const option = this.reactionOptions.find(o => o.type === type);
    return option?.emoji || '👍';
  }

  reactionLabel(type?: ReactionType | null): string {
    if (!type) return 'Reagieren';
    return this.reactionOptions.find(o => o.type === type)?.label || 'Reagieren';
  }

  countComments(comments?: PostComment[]): number {
    if (!comments) return 0;
    return comments.reduce((sum, comment) => sum + 1 + this.countComments(comment.replies), 0);
  }

  focusCommentInput(postId: number): void {
    setTimeout(() => document.getElementById(`comment-input-${postId}`)?.focus(), 0);
  }

  private normalizePost(post: Post): Post {
    return {
      ...post,
      reactions: this.ensureReactionInfo(post.reactions),
      comments: this.normalizeComments(post.comments || [])
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

  private addCommentToPost(postId: number, comment: PostComment): void {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const normalized = this.normalizeComment(comment);
    if (normalized.parentId) {
      const parent = this.findComment(post.comments || [], normalized.parentId);
      if (parent) {
        parent.replies = [...(parent.replies || []), normalized];
      }
    } else {
      post.comments = [...(post.comments || []), normalized];
    }
  }

  private removeCommentFromPost(postId: number, commentId: number): void {
    const post = this.posts.find(p => p.id === postId);
    if (!post || !post.comments) return;
    post.comments = this.removeCommentRecursive(post.comments, commentId);
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
