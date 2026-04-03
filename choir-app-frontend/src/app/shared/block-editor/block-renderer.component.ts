import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import {
  ContentBlock, RichTextBlock, HeroBannerBlock, ImageBlock, ImageTextBlock,
  GalleryBlock, DividerBlock, SpacerBlock, QuoteBlock, CtaBlock, EmbedBlock
} from './block.model';

const SPACER_MAP: Record<string, string> = {
  small: '1rem',
  medium: '2.5rem',
  large: '5rem'
};

@Component({
  selector: 'app-block-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="block-renderer" [ngSwitch]="block.type">

      <!-- Rich Text -->
      <div *ngSwitchCase="'rich-text'" class="rendered-rich-text" [innerHTML]="safeHtml($any(block).html)"></div>

      <!-- Hero Banner -->
      <ng-container *ngSwitchCase="'hero-banner'">
        <div class="rendered-hero-banner"
             [style.backgroundImage]="$any(block).imageUrl ? 'url(' + $any(block).imageUrl + ')' : 'none'"
             [class.has-overlay]="$any(block).overlay">
          <div class="hero-banner-content">
            <h2 *ngIf="$any(block).headline">{{ $any(block).headline }}</h2>
            <p *ngIf="$any(block).subheadline">{{ $any(block).subheadline }}</p>
            <a *ngIf="$any(block).ctaLabel && $any(block).ctaUrl"
               class="hero-btn"
               [href]="$any(block).ctaUrl"
               target="_blank" rel="noopener noreferrer">
              {{ $any(block).ctaLabel }}
            </a>
          </div>
        </div>
      </ng-container>

      <!-- Image -->
      <ng-container *ngSwitchCase="'image'">
        <figure class="rendered-image" [class]="'align-' + $any(block).alignment">
          <img [src]="$any(block).imageUrl" [alt]="$any(block).imageAlt || ''" *ngIf="$any(block).imageUrl" />
          <figcaption *ngIf="$any(block).caption">{{ $any(block).caption }}</figcaption>
        </figure>
      </ng-container>

      <!-- Image + Text -->
      <ng-container *ngSwitchCase="'image-text'">
        <div class="rendered-image-text" [class.reversed]="$any(block).imagePosition === 'right'">
          <div class="image-side" *ngIf="$any(block).imageUrl">
            <img [src]="$any(block).imageUrl" [alt]="$any(block).imageAlt || ''" />
          </div>
          <div class="text-side" [innerHTML]="safeHtml($any(block).html)"></div>
        </div>
      </ng-container>

      <!-- Gallery -->
      <ng-container *ngSwitchCase="'gallery'">
        <div class="rendered-gallery" [style.gridTemplateColumns]="'repeat(' + $any(block).columns + ', 1fr)'">
          <figure class="gallery-item" *ngFor="let img of $any(block).images">
            <img [src]="img.url" [alt]="img.alt || ''" *ngIf="img.url" />
            <figcaption *ngIf="img.caption">{{ img.caption }}</figcaption>
          </figure>
        </div>
      </ng-container>

      <!-- Divider -->
      <ng-container *ngSwitchCase="'divider'">
        <hr class="rendered-divider" [style.borderStyle]="$any(block).style" />
      </ng-container>

      <!-- Spacer -->
      <ng-container *ngSwitchCase="'spacer'">
        <div class="rendered-spacer" [style.height]="spacerHeight($any(block).height)"></div>
      </ng-container>

      <!-- Quote -->
      <ng-container *ngSwitchCase="'quote'">
        <blockquote class="rendered-quote">
          <p>{{ $any(block).text }}</p>
          <cite *ngIf="$any(block).attribution">— {{ $any(block).attribution }}</cite>
        </blockquote>
      </ng-container>

      <!-- CTA -->
      <ng-container *ngSwitchCase="'cta'">
        <div class="rendered-cta" [style.textAlign]="$any(block).alignment">
          <a class="cta-button" [class]="'cta-' + $any(block).style"
             [href]="$any(block).url"
             target="_blank" rel="noopener noreferrer"
             *ngIf="$any(block).label">
            {{ $any(block).label }}
          </a>
        </div>
      </ng-container>

      <!-- Embed -->
      <ng-container *ngSwitchCase="'embed'">
        <div class="rendered-embed" *ngIf="getEmbedUrl($any(block).url) as embedSrc">
          <div class="video-container">
            <iframe [src]="embedSrc"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer">
            </iframe>
          </div>
          <p class="embed-caption" *ngIf="$any(block).caption">{{ $any(block).caption }}</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .block-renderer {
      width: 100%;
    }

    /* Rich Text */
    .rendered-rich-text {
      line-height: 1.7;
      word-wrap: break-word;

      h2, h3, h4 { margin: 1rem 0 0.5rem; }
      p { margin: 0.5rem 0; }
      ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
      blockquote {
        margin: 0.75rem 0;
        padding-left: 1rem;
        border-left: 3px solid currentColor;
        opacity: 0.85;
      }
      a { color: var(--pp-link, #4338ca); }
    }

    /* Hero Banner */
    .rendered-hero-banner {
      position: relative;
      min-height: 280px;
      background-size: cover;
      background-position: center;
      background-color: var(--pp-section-bg, #f5f7fa);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      overflow: hidden;
      padding: 2rem;

      &.has-overlay::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
      }
    }

    .hero-banner-content {
      position: relative;
      z-index: 1;
      text-align: center;
      color: var(--pp-headline, #333);
      max-width: 640px;

      .has-overlay & { color: #fff; }

      h2 { margin: 0 0 0.5rem; font-size: 2rem; }
      p { margin: 0 0 1rem; font-size: 1.1rem; opacity: 0.85; }
    }

    .hero-btn {
      display: inline-block;
      padding: 0.6rem 1.75rem;
      background: var(--pp-btn-primary-bg, #4338ca);
      color: var(--pp-btn-primary-text, #fff);
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }

    /* Image */
    .rendered-image {
      margin: 0;
      text-align: center;

      &.align-left { text-align: left; }
      &.align-right { text-align: right; }
      &.align-full img { width: 100%; }

      img {
        max-width: 100%;
        border-radius: 8px;
        height: auto;
      }

      &.align-left img, &.align-right img {
        max-width: 65%;
      }

      figcaption {
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--pp-meta, #888);
        font-style: italic;
      }
    }

    /* Image + Text */
    .rendered-image-text {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: center;

      &.reversed { direction: rtl; }
      &.reversed > * { direction: ltr; }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
        &.reversed { direction: ltr; }
      }
    }

    .image-side img {
      width: 100%;
      border-radius: 8px;
      height: auto;
    }

    .text-side {
      line-height: 1.6;
      a { color: var(--pp-link, #4338ca); }
    }

    /* Gallery */
    .rendered-gallery {
      display: grid;
      gap: 1rem;
    }

    .gallery-item {
      margin: 0;

      img {
        width: 100%;
        aspect-ratio: 4/3;
        object-fit: cover;
        border-radius: 8px;
      }

      figcaption {
        margin-top: 0.35rem;
        font-size: 0.8rem;
        color: var(--pp-meta, #888);
        text-align: center;
      }
    }

    /* Divider */
    .rendered-divider {
      border-width: 1.5px 0 0 0;
      border-color: var(--pp-card-border, rgba(0, 0, 0, 0.12));
      margin: 1.5rem 0;
    }

    /* Spacer */
    .rendered-spacer {
      width: 100%;
    }

    /* Quote */
    .rendered-quote {
      margin: 1rem 0;
      padding: 1.25rem 1.5rem;
      border-left: 4px solid var(--pp-btn-primary-bg, #4338ca);
      background: var(--pp-section-bg, rgba(0, 0, 0, 0.02));
      border-radius: 0 8px 8px 0;

      p {
        margin: 0;
        font-size: 1.1rem;
        font-style: italic;
        line-height: 1.6;
        color: var(--pp-section-text, #333);
      }

      cite {
        display: block;
        margin-top: 0.75rem;
        font-size: 0.9rem;
        color: var(--pp-meta, #888);
        font-style: normal;
      }
    }

    /* CTA */
    .rendered-cta {
      padding: 1rem 0;
    }

    .cta-button {
      display: inline-block;
      padding: 0.65rem 2rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 1rem;
      text-decoration: none;
      transition: opacity 0.15s;

      &:hover { opacity: 0.9; }

      &.cta-primary {
        background: var(--pp-btn-primary-bg, #4338ca);
        color: var(--pp-btn-primary-text, #fff);
      }
      &.cta-secondary {
        background: var(--pp-section-bg, #f0f0f0);
        color: var(--pp-btn-primary-bg, #4338ca);
      }
      &.cta-outline {
        background: transparent;
        border: 2px solid var(--pp-btn-secondary-border, #4338ca);
        color: var(--pp-btn-secondary-text, #4338ca);
      }
    }

    /* Embed */
    .rendered-embed {
      border-radius: 12px;
      overflow: hidden;
    }

    .video-container {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;

      iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }

    .embed-caption {
      margin: 0;
      padding: 0.5rem;
      font-size: 0.85rem;
      color: var(--pp-meta, #888);
      text-align: center;
    }
  `]
})
export class BlockRendererComponent {
  @Input() block!: ContentBlock;

  constructor(private sanitizer: DomSanitizer) {}

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  spacerHeight(height: string): string {
    return SPACER_MAP[height] || SPACER_MAP['medium'];
  }

  getEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;

    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`);
    }

    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(`https://player.vimeo.com/video/${vimeoMatch[1]}`);
    }

    return null;
  }
}
