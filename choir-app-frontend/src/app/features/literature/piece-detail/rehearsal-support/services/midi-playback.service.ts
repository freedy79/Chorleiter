/**
 * MIDI Playback Engine
 *
 * Provides stable MIDI playback using WebAudio API with lookahead scheduling.
 * Uses soundfont-player for quick instrument loading.
 *
 * Architecture:
 * - Tick-based scheduling for accuracy
 * - Lookahead buffer (150-250ms) to prevent glitches
 * - Per-track GainNodes for volume/mute/solo control
 * - Support for tempo changes and transposition
 *
 * Future extensions:
 * - AudioWorklet for more precise timing
 * - Custom sample libraries
 * - Real-time MIDI input
 */

import { Injectable } from '@angular/core';
import { Midi } from '@tonejs/midi';
import Soundfont from 'soundfont-player';
import {
  NoteEvent,
  MidiFileInfo,
  MidiTrackInfo,
  TempoChange,
  TimeSignature,
  PlaybackState,
  TrackMixerState
} from '../models/rehearsal-data.types';

interface ScheduledNote {
  noteEvent: NoteEvent;
  audioStartTime: number;
  player?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MidiPlaybackService {
  private audioContext: AudioContext | null = null;
  private instruments: Map<number, any> = new Map();
  private trackGainNodes: Map<number, GainNode> = new Map();
  private masterGain: GainNode | null = null;

  private midiData: Midi | null = null;
  private noteEvents: NoteEvent[] = [];
  private midiFileInfo: MidiFileInfo | null = null;

  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    tempoFactor: 1.0,
    transpose: 0,
    currentTick: 0,
    currentTime: 0,
    selectedMeasure: null,
    selectedPage: null
  };

  private trackMixer: Map<number, TrackMixerState> = new Map();
  private schedulerInterval: any = null;
  private scheduledNotes: ScheduledNote[] = [];
  private nextNoteIndex = 0;
  private playbackStartTime = 0;
  private playbackStartTick = 0;

  private readonly SCHEDULER_INTERVAL_MS = 25;
  private readonly LOOKAHEAD_MS = 200;

  constructor() {}

  async initializeAudio(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);

    // Ensure audio context is running (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadMidiFile(file: File): Promise<MidiFileInfo> {
    const arrayBuffer = await file.arrayBuffer();
    this.midiData = new Midi(arrayBuffer);

    // Extract track info
    const tracks: MidiTrackInfo[] = this.midiData.tracks.map((track, index) => ({
      index,
      name: track.name || `Track ${index + 1}`,
      noteCount: track.notes.length,
      channel: track.channel,
      instrument: track.instrument?.number
    }));

    // Extract tempo changes
    const tempoChanges: TempoChange[] = [];
    this.midiData.header.tempos.forEach(t => {
      const microsecondsPerBeat = 60000000 / t.bpm; // Calculate from BPM
      tempoChanges.push({
        tick: t.ticks,
        bpm: t.bpm,
        microsecondsPerBeat
      });
    });

    // Extract time signatures
    const timeSignatures: TimeSignature[] = [];
    this.midiData.header.timeSignatures.forEach(ts => {
      timeSignatures.push({
        tick: ts.ticks,
        numerator: ts.timeSignature[0],
        denominator: ts.timeSignature[1]
      });
    });

    this.midiFileInfo = {
      tracks,
      ppq: this.midiData.header.ppq,
      durationTicks: Math.max(...this.midiData.tracks.map(t =>
        t.notes.length > 0 ? t.notes[t.notes.length - 1].ticks + t.notes[t.notes.length - 1].durationTicks : 0
      )),
      tempoChanges,
      timeSignatures
    };

    // Flatten notes to events
    this.noteEvents = [];
    this.midiData.tracks.forEach((track, trackIndex) => {
      track.notes.forEach(note => {
        this.noteEvents.push({
          trackIndex,
          tick: note.ticks,
          durationTicks: note.durationTicks,
          midi: note.midi,
          velocity: note.velocity,
          time: note.time,
          duration: note.duration
        });
      });
    });

    // Sort by tick
    this.noteEvents.sort((a, b) => a.tick - b.tick);

    // Initialize track mixer
    tracks.forEach(track => {
      this.trackMixer.set(track.index, {
        muted: false,
        solo: false,
        volume: 0.7
      });
    });

    // Load default instrument (acoustic grand piano)
    await this.ensureInstrumentLoaded(0);

    return this.midiFileInfo;
  }

  private async ensureInstrumentLoaded(trackIndex: number): Promise<void> {
    if (!this.audioContext || this.instruments.has(trackIndex)) return;

    const instrument = await Soundfont.instrument(this.audioContext, 'acoustic_grand_piano');
    this.instruments.set(trackIndex, instrument);

    // Create gain node for this track
    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.masterGain!);
    this.trackGainNodes.set(trackIndex, gainNode);

    const mixer = this.trackMixer.get(trackIndex);
    if (mixer) {
      gainNode.gain.value = mixer.volume;
    }
  }

  getMidiFileInfo(): MidiFileInfo | null {
    return this.midiFileInfo;
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  getTrackMixer(trackIndex: number): TrackMixerState | undefined {
    return this.trackMixer.get(trackIndex);
  }

  getAllTrackMixers(): Map<number, TrackMixerState> {
    return new Map(this.trackMixer);
  }

  setTrackMixer(trackIndex: number, state: Partial<TrackMixerState>): void {
    const current = this.trackMixer.get(trackIndex) || { muted: false, solo: false, volume: 0.7 };
    const updated = { ...current, ...state };
    this.trackMixer.set(trackIndex, updated);

    // Update gain node
    const gainNode = this.trackGainNodes.get(trackIndex);
    if (gainNode) {
      const effectiveVolume = this.getEffectiveVolume(trackIndex);
      gainNode.gain.value = effectiveVolume;
    }
  }

  private getEffectiveVolume(trackIndex: number): number {
    const mixer = this.trackMixer.get(trackIndex);
    if (!mixer) return 0.7;

    if (mixer.muted) return 0;

    // Check if any track is soloed
    const hasSolo = Array.from(this.trackMixer.values()).some(m => m.solo);
    if (hasSolo && !mixer.solo) return 0;

    return mixer.volume;
  }

  setTempoFactor(factor: number): void {
    this.playbackState.tempoFactor = Math.max(0.1, Math.min(4.0, factor));
  }

  setTranspose(semitones: number): void {
    this.playbackState.transpose = Math.max(-24, Math.min(24, Math.round(semitones)));
  }

  async play(): Promise<void> {
    if (!this.audioContext || !this.midiFileInfo || !this.noteEvents) {
      throw new Error('MIDI not loaded');
    }

    await this.initializeAudio();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.playbackState.isPaused) {
      this.playbackState.isPaused = false;
      this.playbackState.isPlaying = true;
      this.playbackStartTime = this.audioContext.currentTime - this.ticksToSeconds(this.playbackState.currentTick - this.playbackStartTick);
    } else {
      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;
      this.playbackStartTime = this.audioContext.currentTime;
      this.playbackStartTick = this.playbackState.currentTick;
      this.nextNoteIndex = this.findNoteIndexAtTick(this.playbackState.currentTick);
    }

    this.startScheduler();
  }

  pause(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = true;
    this.stopScheduler();
    this.stopAllScheduledNotes();
  }

  stop(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = false;
    this.playbackState.currentTick = 0;
    this.playbackState.currentTime = 0;
    this.stopScheduler();
    this.stopAllScheduledNotes();
    this.nextNoteIndex = 0;
  }

  jumpToTick(tick: number): void {
    const wasPlaying = this.playbackState.isPlaying;

    if (wasPlaying) {
      this.pause();
    }

    this.playbackState.currentTick = Math.max(0, tick);
    this.playbackState.currentTime = this.ticksToSeconds(this.playbackState.currentTick);
    this.nextNoteIndex = this.findNoteIndexAtTick(this.playbackState.currentTick);
    this.stopAllScheduledNotes();

    if (wasPlaying) {
      this.play();
    }
  }

  private startScheduler(): void {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(() => {
      this.scheduleAhead();
    }, this.SCHEDULER_INTERVAL_MS);
  }

  private stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private scheduleAhead(): void {
    if (!this.audioContext || !this.noteEvents) return;

    const currentAudioTime = this.audioContext.currentTime;
    const scheduleUntilTime = currentAudioTime + this.LOOKAHEAD_MS / 1000;

    // Update current tick
    const elapsedAudioTime = currentAudioTime - this.playbackStartTime;
    const elapsedTicks = this.secondsToTicks(elapsedAudioTime);
    this.playbackState.currentTick = this.playbackStartTick + elapsedTicks;
    this.playbackState.currentTime = this.ticksToSeconds(this.playbackState.currentTick);

    // Schedule notes in lookahead window
    while (this.nextNoteIndex < this.noteEvents.length) {
      const noteEvent = this.noteEvents[this.nextNoteIndex];
      const noteTime = this.ticksToSeconds(noteEvent.tick - this.playbackStartTick) + this.playbackStartTime;

      if (noteTime > scheduleUntilTime) break;

      if (noteTime >= currentAudioTime) {
        this.scheduleNote(noteEvent, noteTime);
      }

      this.nextNoteIndex++;
    }

    // Remove finished notes
    this.scheduledNotes = this.scheduledNotes.filter(sn => sn.audioStartTime + (sn.noteEvent.duration || 0.5) > currentAudioTime);

    // Stop if reached end
    if (this.nextNoteIndex >= this.noteEvents.length && this.scheduledNotes.length === 0) {
      this.stop();
    }
  }

  private scheduleNote(noteEvent: NoteEvent, audioStartTime: number): void {
    const mixer = this.trackMixer.get(noteEvent.trackIndex);
    if (!mixer) return;

    const effectiveVolume = this.getEffectiveVolume(noteEvent.trackIndex);
    if (effectiveVolume === 0) return;

    const instrument = this.instruments.get(noteEvent.trackIndex);
    if (!instrument) return;

    const transposedMidi = noteEvent.midi + this.playbackState.transpose;
    if (transposedMidi < 0 || transposedMidi > 127) return;

    const midiNote = this.midiToNoteName(transposedMidi);
    const duration = (noteEvent.duration || 0.5) / this.playbackState.tempoFactor;
    const velocity = noteEvent.velocity * effectiveVolume;

    try {
      const player = instrument.play(midiNote, audioStartTime, { duration, gain: velocity });

      this.scheduledNotes.push({
        noteEvent,
        audioStartTime,
        player
      });
    } catch (e) {
      console.warn('Failed to schedule note:', e);
    }
  }

  private stopAllScheduledNotes(): void {
    this.scheduledNotes.forEach(sn => {
      if (sn.player && sn.player.stop) {
        try {
          sn.player.stop();
        } catch (e) {
          // Ignore
        }
      }
    });
    this.scheduledNotes = [];
  }

  private findNoteIndexAtTick(tick: number): number {
    // Binary search for first note >= tick
    let left = 0;
    let right = this.noteEvents?.length || 0;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.noteEvents![mid].tick < tick) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }

  private ticksToSeconds(ticks: number): number {
    if (!this.midiFileInfo) return 0;

    // Simple implementation: use first tempo or default 120 BPM
    const bpm = this.midiFileInfo.tempoChanges.length > 0 ? this.midiFileInfo.tempoChanges[0].bpm : 120;
    const ppq = this.midiFileInfo.ppq;
    const secondsPerTick = 60 / (bpm * ppq) / this.playbackState.tempoFactor;

    return ticks * secondsPerTick;
  }

  private secondsToTicks(seconds: number): number {
    if (!this.midiFileInfo) return 0;

    const bpm = this.midiFileInfo.tempoChanges.length > 0 ? this.midiFileInfo.tempoChanges[0].bpm : 120;
    const ppq = this.midiFileInfo.ppq;
    const secondsPerTick = 60 / (bpm * ppq) / this.playbackState.tempoFactor;

    return Math.floor(seconds / secondsPerTick);
  }

  private midiToNoteName(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = noteNames[midi % 12];
    return `${noteName}${octave}`;
  }

  dispose(): void {
    this.stop();
    this.instruments.clear();
    this.trackGainNodes.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
