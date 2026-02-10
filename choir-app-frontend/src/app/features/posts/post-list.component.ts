import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { NotificationService } from '@core/services/notification.service';
import { Post } from '@core/models/post';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { PostDialogComponent } from './post-dialog.component';
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
    private dialogHelper: DialogHelperService,
    private notification: NotificationService,
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
    this.dialogHelper.openDialog<PostDialogComponent, string>(
      PostDialogComponent,
      { width: '600px' }
    ).subscribe(result => {
      if (result === 'created') {
        this.notification.success('Beitrag erstellt');
        this.loadPosts();
      }
    });
  }

  onPostEdited(post: Post): void {
    this.dialogHelper.openDialog<PostDialogComponent, string>(
      PostDialogComponent,
      { width: '600px', data: { post } }
    ).subscribe(result => {
      if (result === 'updated') {
        this.notification.success('Beitrag aktualisiert');
        this.loadPosts();
      }
    });
  }

  onPostDeleted(postId: number): void {
    this.dialogHelper.confirmDelete(
      { itemName: 'diesen Beitrag' },
      () => this.api.deletePost(postId),
      {
        successMessage: 'Beitrag gelöscht',
        errorMessage: 'Fehler beim Löschen',
        onRefresh: () => this.loadPosts()
      }
    ).subscribe();
  }

  onPostPublished(): void {
    // Post component already handles the publish action
    // Just reload the posts list to update the UI
    this.loadPosts();
  }
}
