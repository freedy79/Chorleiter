export interface ProgramItem {
  id: string;
  programId: string;
  sortIndex: number;
  type: 'piece' | 'break' | 'speech' | 'slot';
  durationSec?: number | null;
  /**
   * Optional helper string used in the editor to keep the mm:ss input value
   * while editing. Converted to {@link durationSec} on save.
   */
  durationStr?: string;
  note?: string | null;
  pieceId?: string;
  pieceTitleSnapshot?: string;
  pieceComposerSnapshot?: string;
  pieceDurationSecSnapshot?: number | null;
  instrument?: string | null;
  performerNames?: string | null;
  speechTitle?: string | null;
  speechSource?: string | null;
  speechSpeaker?: string | null;
  speechText?: string | null;
  breakTitle?: string | null;
  slotLabel?: string | null;
}

export interface Program {
  id: string;
  choirId: string;
  title: string;
  description?: string;
  startTime?: string;
  status: string;
  items: ProgramItem[];
}
