/**
 * Block editor model definitions.
 * Each block type has a discriminated union via the `type` field.
 */

// --- Block types ---

export type BlockType =
  | 'rich-text'
  | 'hero-banner'
  | 'image'
  | 'image-text'
  | 'gallery'
  | 'divider'
  | 'spacer'
  | 'quote'
  | 'cta'
  | 'embed';

export interface BlockTypeInfo {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}

export const BLOCK_TYPES: BlockTypeInfo[] = [
  { type: 'rich-text', label: 'Text', icon: 'article', description: 'Formatierter Text mit Überschriften, Listen und Links' },
  { type: 'hero-banner', label: 'Banner', icon: 'view_carousel', description: 'Großer Banner mit Bild, Überschrift und Button' },
  { type: 'image', label: 'Bild', icon: 'image', description: 'Einzelnes Bild mit Beschriftung' },
  { type: 'image-text', label: 'Bild + Text', icon: 'view_sidebar', description: 'Bild neben Text (links oder rechts)' },
  { type: 'gallery', label: 'Galerie', icon: 'photo_library', description: 'Bildergalerie im Raster' },
  { type: 'divider', label: 'Trennlinie', icon: 'horizontal_rule', description: 'Horizontale Trennlinie' },
  { type: 'spacer', label: 'Abstand', icon: 'height', description: 'Vertikaler Abstand' },
  { type: 'quote', label: 'Zitat', icon: 'format_quote', description: 'Hervorgehobenes Zitat mit Quelle' },
  { type: 'cta', label: 'Button', icon: 'smart_button', description: 'Handlungsaufforderungs-Button' },
  { type: 'embed', label: 'Video', icon: 'play_circle', description: 'YouTube- oder Vimeo-Video einbetten' },
];

// --- Base block ---

export interface BaseBlock {
  id: string;
  type: BlockType;
}

// --- Individual block types ---

export interface RichTextBlock extends BaseBlock {
  type: 'rich-text';
  html: string;
}

export interface HeroBannerBlock extends BaseBlock {
  type: 'hero-banner';
  headline: string;
  subheadline: string;
  imageUrl: string;
  imageAlt: string;
  ctaLabel: string;
  ctaUrl: string;
  overlay: boolean;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageUrl: string;
  imageAlt: string;
  caption: string;
  alignment: 'left' | 'center' | 'right' | 'full';
}

export interface ImageTextBlock extends BaseBlock {
  type: 'image-text';
  imageUrl: string;
  imageAlt: string;
  html: string;
  imagePosition: 'left' | 'right';
}

export interface GalleryImage {
  url: string;
  alt: string;
  caption: string;
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  images: GalleryImage[];
  columns: 2 | 3 | 4;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style: 'solid' | 'dashed' | 'dotted' | 'double';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: 'small' | 'medium' | 'large';
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  text: string;
  attribution: string;
}

export interface CtaBlock extends BaseBlock {
  type: 'cta';
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline';
  alignment: 'left' | 'center' | 'right';
}

export interface EmbedBlock extends BaseBlock {
  type: 'embed';
  url: string;
  caption: string;
}

export type ContentBlock =
  | RichTextBlock
  | HeroBannerBlock
  | ImageBlock
  | ImageTextBlock
  | GalleryBlock
  | DividerBlock
  | SpacerBlock
  | QuoteBlock
  | CtaBlock
  | EmbedBlock;

// --- Factory ---

export function createBlock(type: BlockType): ContentBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case 'rich-text':
      return { id, type, html: '' };
    case 'hero-banner':
      return { id, type, headline: '', subheadline: '', imageUrl: '', imageAlt: '', ctaLabel: '', ctaUrl: '', overlay: false };
    case 'image':
      return { id, type, imageUrl: '', imageAlt: '', caption: '', alignment: 'center' };
    case 'image-text':
      return { id, type, imageUrl: '', imageAlt: '', html: '', imagePosition: 'left' };
    case 'gallery':
      return { id, type, images: [], columns: 3 };
    case 'divider':
      return { id, type, style: 'solid' };
    case 'spacer':
      return { id, type, height: 'medium' };
    case 'quote':
      return { id, type, text: '', attribution: '' };
    case 'cta':
      return { id, type, label: '', url: '', style: 'primary', alignment: 'center' };
    case 'embed':
      return { id, type, url: '', caption: '' };
  }
}
