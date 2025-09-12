import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@modules/material.module';
import { Post } from '@core/models/post';

@Component({
  selector: 'app-latest-post-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './latest-post-widget.component.html',
  styleUrls: ['./latest-post-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LatestPostWidgetComponent {
  @Input() post: Post | null = null;
}
