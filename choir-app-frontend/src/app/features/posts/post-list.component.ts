import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Post } from '@core/models/post';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { PostDialogComponent } from './post-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { PostComponent } from './post.component';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, PostComponent],
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss']
})
export class PostListComponent implements OnInit {
  posts: Post[] = [];
  displayCount = 5;
  currentUserId: number | null = null;
  isChoirAdmin = false;
  isAdmin = false;
  isDirector = false;

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
      this.posts = p;
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

  canEdit(): boolean {
    return this.isChoirAdmin;
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

  onPostEdited(post: Post): void {
    const ref = this.dialog.open(PostDialogComponent, { width: '600px', data: { post } });
    ref.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.snackBar.open('Beitrag aktualisiert', 'OK', { duration: 3000 });
        this.loadPosts();
      }
    });
  }

  onPostDeleted(postId: number): void {
    const data: ConfirmDialogData = { title: 'Beitrag löschen?', message: 'Möchten Sie diesen Beitrag wirklich löschen?' };
    const ref = this.dialog.open(ConfirmDialogComponent, { data });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.api.deletePost(postId).subscribe({
          next: () => { this.snackBar.open('Beitrag gelöscht', 'OK', { duration: 3000 }); this.loadPosts(); },
          error: () => this.snackBar.open('Fehler beim Löschen', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  onPostPublished(): void {
    // Post component already handles the publish action
    // Just reload the posts list to update the UI
    this.loadPosts();
  }
}
