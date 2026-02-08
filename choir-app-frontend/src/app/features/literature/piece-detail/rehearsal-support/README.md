# Rehearsal Support - MIDI Playback for Piece Details

## Overview

This component provides MIDI playback functionality for choir pieces with rehearsal support features:

- MIDI file upload and parsing
- WebAudio-based playback with soundfont instruments
- Tempo control (0.5x - 2.0x)
- Transpose (-24 to +24 semitones)
- Jump to measure/page
- Per-voice/track volume, mute, solo controls
- Rehearsal data editor (measure/page mappings, voice-to-track assignments)

## Architecture

### Components

- `rehearsal-support.component.ts` - Main UI component
- `rehearsal-data-editor-dialog.component.ts` - Dialog for editing mappings
- `midi-playback.service.ts` - Core playback engine

### Models

- `rehearsal-data.types.ts` - TypeScript interfaces for data structures

### Key Features

1. **MIDI Parsing**: Uses `@tonejs/midi` to parse MIDI files
2. **Audio Playback**: Uses WebAudio API with `soundfont-player` for instrument synthesis
3. **Scheduler**: Lookahead scheduling (200ms) prevents audio glitches
4. **Track Mixing**: Per-track GainNodes for volume/mute/solo control

## Usage

The component is integrated into piece-detail as an expansion panel:

```html
<app-rehearsal-support [pieceId]="piece.id"></app-rehearsal-support>
```

## Future Extensions

### 1. AudioWorklet for Precise Timing

Replace the interval-based scheduler with AudioWorklet for sub-millisecond accuracy:

```typescript
// Create AudioWorklet processor
class SchedulerWorklet extends AudioWorkletProcessor {
  process() {
    // Schedule notes with precise timing
  }
}

// In service:
await this.audioContext.audioWorklet.addModule('scheduler-worklet.js');
```

### 2. Custom Sample Libraries

Replace soundfont-player with custom high-quality samples:

```typescript
// Load custom samples
const samples = await loadCustomSamples(instrumentName);
const bufferSource = this.audioContext.createBufferSource();
bufferSource.buffer = samples[noteName];
```

### 3. Real-time MIDI Input

Add MIDI input support for keyboard control:

```typescript
// Request MIDI access
const midiAccess = await navigator.requestMIDIAccess();
midiAccess.inputs.forEach(input => {
  input.onmidimessage = (message) => {
    // Handle MIDI input
  };
});
```

### 4. Visual Score Display

Integrate with music notation libraries like VexFlow:

```typescript
import Vex from 'vexflow';

// Render score with playback cursor
const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.SVG);
// Highlight current measure during playback
```

### 5. Backend Persistence

Save rehearsal data to backend:

```typescript
// In rehearsal-support.component.ts
saveRehearsalData() {
  this.apiService.updatePieceRehearsalData(this.pieceId, this.rehearsalData)
    .subscribe(() => {
      this.snackBar.open('Gespeichert', 'OK', { duration: 2000 });
    });
}

// Load on init
loadRehearsalData() {
  this.apiService.getPieceRehearsalData(this.pieceId)
    .subscribe(data => {
      if (data) this.rehearsalData = data;
    });
}
```

### 6. MIDI File Storage

Store MIDI files on backend instead of in-memory:

```typescript
// Upload MIDI to backend
async uploadMidiFile(file: File) {
  const formData = new FormData();
  formData.append('midi', file);
  formData.append('pieceId', this.pieceId.toString());

  await this.http.post('/api/pieces/midi', formData).toPromise();
}

// Load MIDI from backend
async loadMidiFromBackend() {
  const blob = await this.http.get('/api/pieces/midi/' + this.pieceId,
    { responseType: 'blob' }).toPromise();
  const file = new File([blob], 'piece.mid');
  await this.playbackService.loadMidiFile(file);
}
```

## Dependencies

- `@tonejs/midi` - MIDI file parsing
- `soundfont-player` - WebAudio instrument synthesis

## Browser Compatibility

- WebAudio API required (all modern browsers)
- Autoplay policy: Audio context must be resumed after user interaction
- Recommended: Chrome/Edge for best performance

## Performance Notes

- Lookahead scheduling prevents glitches but adds ~200ms latency
- Large MIDI files (>1MB) may take a few seconds to parse
- Multiple simultaneous notes use multiple AudioNodes (browser limit: ~100-200)

## License

Part of Choir Management System - Internal Use
