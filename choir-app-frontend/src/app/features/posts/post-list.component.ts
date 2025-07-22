import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Choir } from '@core/models/choir';
import { Post } from '@core/models/post';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { PostDialogComponent } from './post-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, PostDialogComponent, ConfirmDialogComponent],
  templateUrl: './post-list.component.html'
})
export class PostListComponent implements OnInit {
  posts: Post[] = [];
  currentUserId: number | null = null;
  isChoirAdmin = false;
  activeChoir$!: Observable<Choir | null>;
  constructor(private api: ApiService, private auth: AuthService, private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.activeChoir$ = this.auth.activeChoir$;
  }

  ngOnInit(): void {
    this.loadPosts();
    this.auth.currentUser$.subscribe(u => this.currentUserId = u?.id || null);
    this.api.checkChoirAdminStatus().subscribe(r => this.isChoirAdmin = r.isChoirAdmin);
  }

  loadPosts(): void {
    this.api.getPosts().subscribe(p => this.posts = p);
  }

  canEdit(post: Post): boolean {
    return this.isChoirAdmin || post.userId === this.currentUserId;
  }

  addPost(): void {
    const ref = this.dialog.open(PostDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.createPost(result).subscribe({
          next: () => { this.snackBar.open('Beitrag erstellt', 'OK', { duration: 3000 }); this.loadPosts(); },
          error: () => this.snackBar.open('Fehler beim Speichern', 'Schließen', { duration: 4000 })
        });
      }
    });
  }

  editPost(post: Post): void {
    const ref = this.dialog.open(PostDialogComponent, { width: '600px', data: { post } });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.api.updatePost(post.id, result).subscribe({
          next: () => { this.snackBar.open('Beitrag aktualisiert', 'OK', { duration: 3000 }); this.loadPosts(); },
          error: () => this.snackBar.open('Fehler beim Aktualisieren', 'Schließen', { duration: 4000 })
        });
      }
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
}
