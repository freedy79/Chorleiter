import { EventShortPipe, PlanEntry } from './event-short.pipe';

describe('EventShortPipe', () => {
  let pipe: EventShortPipe;

  beforeEach(() => {
    pipe = new EventShortPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('Gottesdienst (GD) detection', () => {
    it('should return "GD" for "Gottesdienst"', () => {
      expect(pipe.transform({ notes: 'Gottesdienst' })).toBe('GD');
      expect(pipe.transform({ notes: 'Gottesdienst 10:00' })).toBe('GD');
      expect(pipe.transform({ notes: 'Gottesdienst im Dom' })).toBe('GD');
    });

    it('should return "GD" for "GD" abbreviation', () => {
      expect(pipe.transform({ notes: 'GD' })).toBe('GD');
      expect(pipe.transform({ notes: 'GD 10:00' })).toBe('GD');
      expect(pipe.transform({ notes: 'GD am Sonntag' })).toBe('GD');
    });

    it('should be case-insensitive for Gottesdienst', () => {
      expect(pipe.transform({ notes: 'gottesdienst' })).toBe('GD');
      expect(pipe.transform({ notes: 'GOTTESDIENST' })).toBe('GD');
      expect(pipe.transform({ notes: 'GoTtEsDiEnSt' })).toBe('GD');
    });

    it('should match Gottesdienst as whole word only', () => {
      expect(pipe.transform({ notes: 'Gottesdienst' })).toBe('GD');
      // Note: Due to word boundary, partial matches should not trigger
      expect(pipe.transform({ notes: 'Gottesdienstordnung' })).toBe('');
    });
  });

  describe('Chorprobe (CP) detection', () => {
    it('should return "CP" for "Chorprobe"', () => {
      expect(pipe.transform({ notes: 'Chorprobe' })).toBe('CP');
      expect(pipe.transform({ notes: 'Chorprobe 18:00' })).toBe('CP');
      expect(pipe.transform({ notes: 'Chorprobe im Gemeindesaal' })).toBe('CP');
    });

    it('should return "CP" for "Probe"', () => {
      expect(pipe.transform({ notes: 'Probe' })).toBe('CP');
      expect(pipe.transform({ notes: 'Probe 18:00' })).toBe('CP');
    });

    it('should return "CP" for "CP" abbreviation', () => {
      expect(pipe.transform({ notes: 'CP' })).toBe('CP');
      expect(pipe.transform({ notes: 'CP 18:00' })).toBe('CP');
    });

    it('should be case-insensitive for Chorprobe', () => {
      expect(pipe.transform({ notes: 'chorprobe' })).toBe('CP');
      expect(pipe.transform({ notes: 'CHORPROBE' })).toBe('CP');
      expect(pipe.transform({ notes: 'ChOrPrObE' })).toBe('CP');
    });

    it('should match Probe as whole word only', () => {
      expect(pipe.transform({ notes: 'Probe' })).toBe('CP');
      expect(pipe.transform({ notes: 'Chorprobe' })).toBe('CP');
    });
  });

  describe('priority and mixed content', () => {
    it('should return "GD" when both Gottesdienst and Probe are mentioned (GD comes first in code)', () => {
      expect(pipe.transform({ notes: 'Gottesdienst mit Chorprobe' })).toBe('GD');
    });

    it('should handle notes with additional context', () => {
      expect(pipe.transform({ notes: 'Hauptgottesdienst um 10:00 Uhr' })).toBe('GD');
      expect(pipe.transform({ notes: 'Wöchentliche Chorprobe, 18:00-20:00' })).toBe('CP');
    });

    it('should handle multiline notes', () => {
      expect(pipe.transform({ notes: 'Termin:\nGottesdienst\nOrt: Kirche' })).toBe('GD');
      expect(pipe.transform({ notes: 'Termin:\nChorprobe\nOrt: Gemeindesaal' })).toBe('CP');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty object', () => {
      expect(pipe.transform({})).toBe('');
    });

    it('should return empty string for null notes', () => {
      expect(pipe.transform({ notes: null })).toBe('');
    });

    it('should return empty string for undefined notes', () => {
      expect(pipe.transform({ notes: undefined })).toBe('');
    });

    it('should return empty string for empty string notes', () => {
      expect(pipe.transform({ notes: '' })).toBe('');
    });

    it('should return empty string for unrecognized event types', () => {
      expect(pipe.transform({ notes: 'Konzert' })).toBe('');
      expect(pipe.transform({ notes: 'Sitzung' })).toBe('');
      expect(pipe.transform({ notes: 'Feier' })).toBe('');
    });
  });

  describe('real-world examples', () => {
    it('should handle typical service notes', () => {
      expect(pipe.transform({ notes: 'Sonntagsgottesdienst 10:00 Uhr' })).toBe('GD');
      expect(pipe.transform({ notes: 'GD mit Abendmahl' })).toBe('GD');
      expect(pipe.transform({ notes: 'Festgottesdienst' })).toBe('GD');
    });

    it('should handle typical rehearsal notes', () => {
      expect(pipe.transform({ notes: 'Chorprobe im Gemeindesaal, 18:00-20:00' })).toBe('CP');
      expect(pipe.transform({ notes: 'Probe für Weihnachtskonzert' })).toBe('CP');
      expect(pipe.transform({ notes: 'CP: Vorbereitung Ostern' })).toBe('CP');
    });

    it('should handle German-specific terminology', () => {
      expect(pipe.transform({ notes: 'Abendgottesdienst' })).toBe('GD');
      expect(pipe.transform({ notes: 'Zusätzliche Probe' })).toBe('CP');
    });
  });

  describe('whitespace handling', () => {
    it('should handle leading/trailing whitespace', () => {
      expect(pipe.transform({ notes: '  Gottesdienst  ' })).toBe('GD');
      expect(pipe.transform({ notes: '  Chorprobe  ' })).toBe('CP');
    });

    it('should handle tabs and newlines', () => {
      expect(pipe.transform({ notes: '\tGottesdienst\n' })).toBe('GD');
      expect(pipe.transform({ notes: '\tChorprobe\n' })).toBe('CP');
    });
  });
});
