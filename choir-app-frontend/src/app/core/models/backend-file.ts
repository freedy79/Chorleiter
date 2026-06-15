export interface BackendFile {
  filename: string;
  sizeBytes?: number;
  pieceId?: number | null;
  pieceTitle?: string | null;
  collectionId?: number | null;
  collectionTitle?: string | null;
  downloadName?: string | null;
}

export interface UploadUsage {
  covers: number;
  images: number;
  files: number;
  total: number;
}

export interface UploadOverview {
  covers: BackendFile[];
  images: BackendFile[];
  files: BackendFile[];
  usage?: UploadUsage;
}
