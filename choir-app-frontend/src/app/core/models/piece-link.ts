import { AudioMarker } from './audio-marker';

export interface PieceLink {
    id: number;
    url: string;
    description: string;
    type: 'EXTERNAL' | 'FILE_DOWNLOAD';
    downloadName?: string;
    markers?: AudioMarker[];
}
