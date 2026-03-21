import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { PublicChoirPageResponse } from '@core/models/choir-public-page';
import { getColorScheme } from '@core/models/color-schemes';
import { BlockRendererComponent, ContentBlock } from '@shared/block-editor';

@Component({
  selector: 'app-public-choir-page',
  standalone: true,
  imports: [CommonModule, RouterLink, BlockRendererComponent],
  templateUrl: './public-choir-page.component.html',
  styleUrl: './public-choir-page.component.scss'
})
export class PublicChoirPageComponent implements OnInit {
  loading = true;
  notFound = false;
  pageData: PublicChoirPageResponse | null = null;

  get isHeroTemplate(): boolean {
    return this.pageData?.page?.templateKey === 'hero';
  }

  get heroImageUrl(): string | null {
    return this.pageData?.page?.assets?.[0]?.url || null;
  }

  get featureBlocks() {
    return this.pageData?.page?.contentBlocks?.slice(0, 6) || [];
  }

  get richBlocks(): ContentBlock[] {
    return (this.pageData?.page as any)?.richBlocks || [];
  }

  get schemeVars(): Record<string, string> {
    const key = this.pageData?.page?.colorScheme || 'elegant-light';
    return getColorScheme(key).vars;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly apiService: ApiService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading = false;
      this.notFound = true;
      return;
    }

    this.apiService.getPublicPageBySlug(slug).subscribe({
      next: response => {
        this.pageData = response;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notFound = true;
      }
    });
  }
}
