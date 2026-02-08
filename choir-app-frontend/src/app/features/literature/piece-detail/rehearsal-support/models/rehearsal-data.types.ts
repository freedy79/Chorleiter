/**
 * Rehearsal Support Types
 *
 * Data model for MIDI playback and rehearsal configuration
 */

export interface RehearsalData {
  ppq: number;
  measureToTick: Record<string, number>;
  pageToTick: Record<string, number>;
  voicing: Record<string, number>; // voiceName -> trackIndex (1-based)
}

export interface MidiTrackInfo {
  index: number; // 0-based in library
  name: string;
  noteCount: number;
  channel?: number;
  instrument?: number;
}

export interface MidiFileInfo {
  tracks: MidiTrackInfo[];
  ppq: number;
  durationTicks: number;
  tempoChanges: TempoChange[];
  timeSignatures: TimeSignature[];
}

export interface TempoChange {
  tick: number;
  bpm: number;
  microsecondsPerBeat: number;
}

export interface TimeSignature {
  tick: number;
  numerator: number;
  denominator: number;
}

export interface NoteEvent {
  trackIndex: number;
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  time?: number; // seconds (calculated)
  duration?: number; // seconds (calculated)
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  tempoFactor: number;
  transpose: number;
  currentTick: number;
  currentTime: number;
  selectedMeasure: string | null;
  selectedPage: string | null;
}

export interface TrackMixerState {
  muted: boolean;
  solo: boolean;
  volume: number; // 0..1
}

export interface VoiceMixerState {
  [voiceName: string]: TrackMixerState;
}
