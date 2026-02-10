import { ComposerYearsPipe, ComposerYears } from './composer-years.pipe';

describe('ComposerYearsPipe', () => {
  let pipe: ComposerYearsPipe;

  beforeEach(() => {
    pipe = new ComposerYearsPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('with both birth and death years', () => {
    it('should format with parentheses by default', () => {
      const composer: ComposerYears = { birthYear: 1685, deathYear: 1750 };
      expect(pipe.transform(composer)).toBe(' (1685-1750)');
    });

    it('should format without parentheses when requested', () => {
      const composer: ComposerYears = { birthYear: 1685, deathYear: 1750 };
      expect(pipe.transform(composer, false)).toBe('1685-1750');
    });

    it('should handle different year ranges', () => {
      expect(pipe.transform({ birthYear: 1756, deathYear: 1791 })).toBe(' (1756-1791)');
      expect(pipe.transform({ birthYear: 1810, deathYear: 1849 })).toBe(' (1810-1849)');
      expect(pipe.transform({ birthYear: 1770, deathYear: 1827 })).toBe(' (1770-1827)');
    });
  });

  describe('with only birth year', () => {
    it('should format birth year only with parentheses', () => {
      const composer: ComposerYears = { birthYear: 1900 };
      expect(pipe.transform(composer)).toBe(' (1900)');
    });

    it('should format birth year only without parentheses when requested', () => {
      const composer: ComposerYears = { birthYear: 1900 };
      expect(pipe.transform(composer, false)).toBe('1900');
    });

    it('should handle death year as null explicitly', () => {
      const composer: ComposerYears = { birthYear: 1950, deathYear: null };
      expect(pipe.transform(composer)).toBe(' (1950)');
    });

    it('should handle death year as undefined explicitly', () => {
      const composer: ComposerYears = { birthYear: 1950, deathYear: undefined };
      expect(pipe.transform(composer)).toBe(' (1950)');
    });

    it('should handle death year as 0 (falsy but valid)', () => {
      const composer: ComposerYears = { birthYear: 1950, deathYear: 0 };
      expect(pipe.transform(composer)).toBe(' (1950)');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null input', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty object', () => {
      expect(pipe.transform({})).toBe('');
    });

    it('should return empty string when birthYear is null', () => {
      const composer: ComposerYears = { birthYear: null, deathYear: 1750 };
      expect(pipe.transform(composer)).toBe('');
    });

    it('should return empty string when birthYear is undefined', () => {
      const composer: ComposerYears = { birthYear: undefined, deathYear: 1750 };
      expect(pipe.transform(composer)).toBe('');
    });

    it('should return empty string when birthYear is 0 (falsy)', () => {
      const composer: ComposerYears = { birthYear: 0, deathYear: 1750 };
      expect(pipe.transform(composer)).toBe('');
    });
  });

  describe('historical composers', () => {
    it('should format Johann Sebastian Bach (1685-1750)', () => {
      expect(pipe.transform({ birthYear: 1685, deathYear: 1750 })).toBe(' (1685-1750)');
    });

    it('should format Wolfgang Amadeus Mozart (1756-1791)', () => {
      expect(pipe.transform({ birthYear: 1756, deathYear: 1791 })).toBe(' (1756-1791)');
    });

    it('should format Ludwig van Beethoven (1770-1827)', () => {
      expect(pipe.transform({ birthYear: 1770, deathYear: 1827 })).toBe(' (1770-1827)');
    });

    it('should format a living composer (birth year only)', () => {
      expect(pipe.transform({ birthYear: 1980 })).toBe(' (1980)');
    });
  });
});
