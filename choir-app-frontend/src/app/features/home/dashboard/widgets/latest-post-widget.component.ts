import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';

@Component({
  selector: 'app-latest-post-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, MarkdownPipe],
  templateUrl: './latest-post-widget.component.html',
  styleUrls: ['./latest-post-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LatestPostWidgetComponent {
   @Input() post: Post | null = null;

   constructor(private router: Router) {}

   openLatestPost(post: Post): void {
    this.router.navigate(['/posts'], { fragment: `post-${post.id}` });
  }

}
