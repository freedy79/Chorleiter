export interface ChoirPublicAsset {
  id: number;
  url: string;
  mimeType: string;
  altText?: string | null;
  sortOrder: number;
  createdAt?: string;
}

export interface ChoirPublicContentBlock {
  id: string;
  type: 'text' | 'hero' | 'gallery' | string;
  title?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export interface ChoirPublicPage {
  id?: number;
  choirId?: number;
  isEnabled: boolean;
  isPublished: boolean;
  slug?: string | null;
  templateKey: 'classic' | 'hero' | 'gallery' | string;
  colorScheme?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  contentBlocks: ChoirPublicContentBlock[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  assets: ChoirPublicAsset[];
  choir?: { name: string; description?: string | null; location?: string | null };
}

export interface PublicChoirPageResponse {
  choir: {
    id: number;
    name: string;
    description?: string;
    location?: string;
  };
  page: ChoirPublicPage;
}

export interface SlugAvailabilityResponse {
  slug: string;
  available: boolean;
}
