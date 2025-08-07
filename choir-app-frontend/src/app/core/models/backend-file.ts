export interface BackendFile {
  filename: string;
  pieceId?: number | null;
  pieceTitle?: string | null;
  collectionId?: number | null;
  collectionTitle?: string | null;
}

export interface UploadOverview {
  covers: BackendFile[];
  images: BackendFile[];
  files: BackendFile[];
}
