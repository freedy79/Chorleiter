import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDrawer } from '@angular/material/sidenav';

import { MaterialModule } from '@modules/material.module';
import { ApiService } from 'src/app/core/services/api.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ChoirPublicAsset, ChoirPublicContentBlock } from '@core/models/choir-public-page';
import { COLOR_SCHEMES, ColorScheme, getColorScheme } from '@core/models/color-schemes';
import { environment } from 'src/environments/environment';
import { BlockEditorComponent, BlockRendererComponent, ContentBlock } from '@shared/block-editor';

type DrawerSection = 'settings' | 'header' | 'images' | 'blocks' | 'contact' | 'seo';

@Component({
  selector: 'app-public-page-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MaterialModule, BlockEditorComponent, BlockRendererComponent],
  templateUrl: './public-page-editor.component.html',
  styleUrls: ['./public-page-editor.component.scss']
})
export class PublicPageEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  publicPageForm: FormGroup;
  publicBlocks: ChoirPublicContentBlock[] = [];
  contentBlocks: ContentBlock[] = [];
  publicAssets: ChoirPublicAsset[] = [];
  publicPageUrlPreview: string | null = null;
  slugAvailability: boolean | null = null;
  slugChecking = false;
  uploadingPublicAsset = false;
  selectedPublicImageFile: File | null = null;

  adminChoirId: number | null = null;

  colorSchemes = COLOR_SCHEMES;
  selectedColorScheme = 'elegant-light';

  activeSection: DrawerSection | null = null;
  @ViewChild('drawer') drawer!: MatDrawer;

  choirName = '';
  choirDescription = '';
  choirLocation = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private notification: NotificationService,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.publicPageForm = this.fb.group({
      isEnabled: [false],
      isPublished: [false],
      slug: [''],
      templateKey: ['hero'],
      headline: [''],
      subheadline: [''],
      contactEmail: [''],
      contactPhone: [''],
      websiteUrl: [''],
      seoTitle: [''],
      seoDescription: [''],
      ogImageUrl: ['']
    });
  }

  get activeScheme(): ColorScheme {
    return getColorScheme(this.selectedColorScheme);
  }

  get schemeVars(): Record<string, string> {
    return this.activeScheme.vars;
  }

  get previewHeadline(): string {
    return this.publicPageForm.value.headline || this.choirName || 'Mein Chor';
  }

  get previewSubheadline(): string {
    return this.publicPageForm.value.subheadline || this.choirDescription || '';
  }

  get previewHeroImage(): string | null {
    return this.publicAssets.length > 0 ? this.publicAssets[0].url : null;
  }

  get previewFeatureBlocks(): ChoirPublicContentBlock[] {
    return this.publicBlocks.slice(0, 6);
  }

  get isHeroTemplate(): boolean {
    return this.publicPageForm.value.templateKey === 'hero';
  }

  ngOnInit(): void {
    const choirIdParam = this.route.snapshot.queryParamMap.get('choirId');
    this.adminChoirId = choirIdParam ? parseInt(choirIdParam, 10) : null;

    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data: any) => {
      const publicPage = data['publicPage'];
      if (publicPage) {
        this.applyPageData(publicPage);
      }
    });
  }

  private applyPageData(publicPage: any): void {
    this.publicPageForm.patchValue({
      isEnabled: !!publicPage.isEnabled,
      isPublished: !!publicPage.isPublished,
      slug: publicPage.slug || '',
      templateKey: publicPage.templateKey || 'hero',
      headline: publicPage.headline || '',
      subheadline: publicPage.subheadline || '',
      contactEmail: publicPage.contactEmail || '',
      contactPhone: publicPage.contactPhone || '',
      websiteUrl: publicPage.websiteUrl || '',
      seoTitle: publicPage.seoTitle || '',
      seoDescription: publicPage.seoDescription || '',
      ogImageUrl: publicPage.ogImageUrl || ''
    });
    this.publicBlocks = Array.isArray(publicPage.contentBlocks) ? [...publicPage.contentBlocks] : [];
    this.contentBlocks = Array.isArray(publicPage.richBlocks) ? [...publicPage.richBlocks] : [];
    this.publicAssets = Array.isArray(publicPage.assets) ? [...publicPage.assets] : [];
    this.selectedColorScheme = publicPage.colorScheme || 'elegant-light';
    this.publicPageUrlPreview = publicPage.slug ? `${environment.baseUrl}/c/${publicPage.slug}` : null;

    if (publicPage.choir) {
      this.choirName = publicPage.choir.name || '';
      this.choirDescription = publicPage.choir.description || '';
      this.choirLocation = publicPage.choir.location || '';
    }
  }

  openSection(section: DrawerSection): void {
    if (this.activeSection === section && this.drawer?.opened) {
      this.drawer.close();
      this.activeSection = null;
    } else {
      this.activeSection = section;
      this.drawer?.open();
    }
  }

  closeDrawer(): void {
    this.activeSection = null;
    this.drawer?.close();
  }

  selectColorScheme(key: string): void {
    this.selectedColorScheme = key;
  }

  addPublicTextBlock(): void {
    this.publicBlocks = [
      ...this.publicBlocks,
      {
        id: `block-${Date.now()}`,
        type: 'text',
        title: '',
        text: ''
      }
    ];
  }

  removePublicBlock(index: number): void {
    this.publicBlocks = this.publicBlocks.filter((_, idx) => idx !== index);
  }

  checkPublicSlugAvailability(): void {
    const slug = String(this.publicPageForm.value.slug || '').trim();
    if (!slug) {
      this.slugAvailability = null;
      return;
    }

    this.slugChecking = true;
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.checkPublicPageSlugAvailability(slug, opts).subscribe({
      next: (result) => {
        this.slugAvailability = result.available;
        this.slugChecking = false;
      },
      error: () => {
        this.slugAvailability = null;
        this.slugChecking = false;
        this.notification.error('Slug konnte nicht geprüft werden.');
      }
    });
  }

  onSelectPublicImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedPublicImageFile = file;
  }

  uploadPublicImage(): void {
    if (!this.selectedPublicImageFile) {
      return;
    }

    this.uploadingPublicAsset = true;
    const opts = this.adminChoirId
      ? { choirId: this.adminChoirId, sortOrder: this.publicAssets.length }
      : { sortOrder: this.publicAssets.length };

    this.apiService.uploadPublicPageAsset(this.selectedPublicImageFile, opts).subscribe({
      next: () => {
        this.uploadingPublicAsset = false;
        this.selectedPublicImageFile = null;
        this.notification.success('Bild hochgeladen.');
        this.reloadPublicPage();
      },
      error: () => {
        this.uploadingPublicAsset = false;
        this.notification.error('Bild konnte nicht hochgeladen werden.');
      }
    });
  }

  removePublicImage(assetId: number): void {
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.deletePublicPageAsset(assetId, opts).subscribe({
      next: () => {
        this.notification.success('Bild entfernt.');
        this.reloadPublicPage();
      },
      error: () => {
        this.notification.error('Bild konnte nicht entfernt werden.');
      }
    });
  }

  onContentBlocksChange(blocks: ContentBlock[]): void {
    this.contentBlocks = blocks;
  }

  savePublicPage(): void {
    const payload = {
      ...this.publicPageForm.value,
      contentBlocks: this.publicBlocks,
      richBlocks: this.contentBlocks,
      colorScheme: this.selectedColorScheme
    };
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.updateMyPublicPage(payload, opts).subscribe({
      next: (response) => {
        const savedSlug = response.page?.slug || this.publicPageForm.value.slug;
        this.publicPageUrlPreview = savedSlug ? `${environment.baseUrl}/c/${savedSlug}` : null;
        this.notification.success('Vorstellungsseite gespeichert.');
        this.slugAvailability = null;
      },
      error: (err) => {
        if (err?.status === 409) {
          this.notification.error('Dieser Slug ist bereits vergeben.');
          return;
        }
        this.notification.error('Fehler beim Speichern der Vorstellungsseite.');
      }
    });
  }

  private reloadPublicPage(): void {
    const opts = this.adminChoirId ? { choirId: this.adminChoirId } : undefined;
    this.apiService.getMyPublicPage(opts).pipe(takeUntil(this.destroy$)).subscribe(publicPage => {
      this.applyPageData(publicPage);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
