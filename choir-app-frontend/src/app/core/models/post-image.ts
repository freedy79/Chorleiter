export interface PostImage {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  position: number;
  publicToken?: string;
  url?: string;
}
