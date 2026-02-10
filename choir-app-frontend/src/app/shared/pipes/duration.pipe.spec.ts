import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  let pipe: DurationPipe;

  beforeEach(() => {
    pipe = new DurationPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('valid inputs', () => {
    it('should format 0 seconds as "00:00"', () => {
      expect(pipe.transform(0)).toBe('00:00');
    });

    it('should format seconds less than a minute', () => {
      expect(pipe.transform(5)).toBe('00:05');
      expect(pipe.transform(30)).toBe('00:30');
      expect(pipe.transform(59)).toBe('00:59');
    });

    it('should format exactly one minute as "01:00"', () => {
      expect(pipe.transform(60)).toBe('01:00');
    });

    it('should format minutes and seconds correctly', () => {
      expect(pipe.transform(65)).toBe('01:05');
      expect(pipe.transform(125)).toBe('02:05');
      expect(pipe.transform(185)).toBe('03:05');
    });

    it('should format durations over an hour (no hour display, just minutes)', () => {
      expect(pipe.transform(3600)).toBe('60:00');
      expect(pipe.transform(3661)).toBe('61:01');
      expect(pipe.transform(7325)).toBe('122:05');
    });

    it('should handle fractional seconds by flooring', () => {
      expect(pipe.transform(65.7)).toBe('01:05');
      expect(pipe.transform(125.9)).toBe('02:05');
    });

    it('should pad single-digit minutes and seconds with leading zeros', () => {
      expect(pipe.transform(5)).toBe('00:05');
      expect(pipe.transform(61)).toBe('01:01');
      expect(pipe.transform(545)).toBe('09:05');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should handle negative numbers gracefully', () => {
      // Math.floor of negative numbers rounds down (more negative)
      expect(pipe.transform(-65)).toBe('-02:-05');
    });
  });

  describe('invalid inputs', () => {
    it('should return empty string for non-number types', () => {
      expect(pipe.transform('125' as any)).toBe('');
      expect(pipe.transform({} as any)).toBe('');
      expect(pipe.transform([] as any)).toBe('');
      expect(pipe.transform(NaN)).toBe('');
    });
  });
});
