/**
 * Type definitions for soundfont-player
 */

declare module 'soundfont-player' {
  interface Player {
    play(note: string | number, when?: number, options?: PlayOptions): AudioNode & { stop: () => void };
    stop(): void;
    schedule(when: number, events: Array<{ time: number; note: string | number; duration?: number }>): void;
  }

  interface PlayOptions {
    gain?: number;
    duration?: number;
    loop?: boolean;
  }

  interface InstrumentOptions {
    from?: string;
    soundfont?: string;
    nameToUrl?: (name: string, soundfont: string, format: string) => string;
    destination?: AudioNode;
    gain?: number;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
  }

  function instrument(
    audioContext: AudioContext,
    instrumentName: string,
    options?: InstrumentOptions
  ): Promise<Player>;

  export default { instrument };
  export { instrument, Player, PlayOptions, InstrumentOptions };
}
