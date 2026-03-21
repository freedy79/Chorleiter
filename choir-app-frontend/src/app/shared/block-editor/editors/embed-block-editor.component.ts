import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MaterialModule } from '@modules/material.module';
import { EmbedBlock } from '../block.model';

@Component({
  selector: 'app-embed-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  template: `
    <div class="embed-editor">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Video-URL</mat-label>
        <input matInput [ngModel]="block.url" (ngModelChange)="update('url', $event)"
               placeholder="https://www.youtube.com/watch?v=... oder https://vimeo.com/..." />
        <mat-icon matSuffix>play_circle</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Beschriftung</mat-label>
        <input matInput [ngModel]="block.caption" (ngModelChange)="update('caption', $event)" />
      </mat-form-field>

      <!-- Preview -->
      <div class="preview" *ngIf="embedUrl">
        <div class="video-container">
          <iframe [src]="embedUrl"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  loading="lazy"
                  referrerpolicy="no-referrer">
          </iframe>
        </div>
        <p class="caption" *ngIf="block.caption">{{ block.caption }}</p>
      </div>

      <p class="hint" *ngIf="block.url && !embedUrl">
        <mat-icon>info</mat-icon>
        Unterstützte URLs: YouTube (youtube.com/watch?v=...) und Vimeo (vimeo.com/...)
      </p>
    </div>
  `,
  styles: [`
    .embed-editor {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .full-width { width: 100%; }

    .preview {
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      overflow: hidden;
      background: #000;
    }

    .video-container {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 */
      height: 0;

      iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }

    .caption {
      margin: 0;
      padding: 0.5rem;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: rgba(0, 0, 0, 0.45);

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }
  `]
})
export class EmbedBlockEditorComponent {
  @Input() block!: EmbedBlock;
  @Output() blockChange = new EventEmitter<EmbedBlock>();

  constructor(private sanitizer: DomSanitizer) {}

  get embedUrl(): SafeResourceUrl | null {
    return this.getEmbedUrl(this.block.url);
  }

  update(field: keyof EmbedBlock, value: string): void {
    this.blockChange.emit({ ...this.block, [field]: value });
  }

  private getEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`);
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://player.vimeo.com/video/${vimeoMatch[1]}`);
    }

    return null;
  }
}
