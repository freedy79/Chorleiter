import { WeekdayPipe } from './weekday.pipe';

describe('WeekdayPipe', () => {
  let pipe: WeekdayPipe;

  beforeEach(() => {
    pipe = new WeekdayPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('short format (default)', () => {
    it('should return "So" for Sunday', () => {
      expect(pipe.transform('2024-01-07')).toBe('So'); // Sunday
      expect(pipe.transform('2024-01-14')).toBe('So'); // Sunday
    });

    it('should return "Mo" for Monday', () => {
      expect(pipe.transform('2024-01-01')).toBe('Mo'); // Monday
      expect(pipe.transform('2024-01-08')).toBe('Mo'); // Monday
    });

    it('should return "Di" for Tuesday', () => {
      expect(pipe.transform('2024-01-02')).toBe('Di'); // Tuesday
      expect(pipe.transform('2024-01-09')).toBe('Di'); // Tuesday
    });

    it('should return "Mi" for Wednesday', () => {
      expect(pipe.transform('2024-01-03')).toBe('Mi'); // Wednesday
      expect(pipe.transform('2024-01-10')).toBe('Mi'); // Wednesday
    });

    it('should return "Do" for Thursday', () => {
      expect(pipe.transform('2024-01-04')).toBe('Do'); // Thursday
      expect(pipe.transform('2024-01-11')).toBe('Do'); // Thursday
    });

    it('should return "Fr" for Friday', () => {
      expect(pipe.transform('2024-01-05')).toBe('Fr'); // Friday
      expect(pipe.transform('2024-01-12')).toBe('Fr'); // Friday
    });

    it('should return "Sa" for Saturday', () => {
      expect(pipe.transform('2024-01-06')).toBe('Sa'); // Saturday
      expect(pipe.transform('2024-01-13')).toBe('Sa'); // Saturday
    });
  });

  describe('long format', () => {
    it('should return "Sonntag" for Sunday', () => {
      expect(pipe.transform('2024-01-07', 'long')).toBe('Sonntag');
    });

    it('should return "Montag" for Monday', () => {
      expect(pipe.transform('2024-01-01', 'long')).toBe('Montag');
    });

    it('should return "Dienstag" for Tuesday', () => {
      expect(pipe.transform('2024-01-02', 'long')).toBe('Dienstag');
    });

    it('should return "Mittwoch" for Wednesday', () => {
      expect(pipe.transform('2024-01-03', 'long')).toBe('Mittwoch');
    });

    it('should return "Donnerstag" for Thursday', () => {
      expect(pipe.transform('2024-01-04', 'long')).toBe('Donnerstag');
    });

    it('should return "Freitag" for Friday', () => {
      expect(pipe.transform('2024-01-05', 'long')).toBe('Freitag');
    });

    it('should return "Samstag" for Saturday', () => {
      expect(pipe.transform('2024-01-06', 'long')).toBe('Samstag');
    });
  });

  describe('Date object input', () => {
    it('should handle Date objects in short format', () => {
      const monday = new Date('2024-01-01T00:00:00Z');
      expect(pipe.transform(monday)).toBe('Mo');

      const friday = new Date('2024-01-05T00:00:00Z');
      expect(pipe.transform(friday)).toBe('Fr');
    });

    it('should handle Date objects in long format', () => {
      const monday = new Date('2024-01-01T00:00:00Z');
      expect(pipe.transform(monday, 'long')).toBe('Montag');

      const friday = new Date('2024-01-05T00:00:00Z');
      expect(pipe.transform(friday, 'long')).toBe('Freitag');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should handle invalid date gracefully', () => {
      expect(pipe.transform('invalid-date')).toBe('');
      expect(pipe.transform('not-a-date')).toBe('');
    });
  });

  describe('different date formats', () => {
    it('should handle ISO date strings', () => {
      expect(pipe.transform('2024-01-01')).toBe('Mo');
      expect(pipe.transform('2024-12-31')).toBe('Di');
    });

    it('should handle dates from different months', () => {
      expect(pipe.transform('2024-02-01')).toBe('Do'); // Thursday
      expect(pipe.transform('2024-03-01')).toBe('Fr'); // Friday
      expect(pipe.transform('2024-04-01')).toBe('Mo'); // Monday
    });

    it('should handle dates from different years', () => {
      expect(pipe.transform('2023-01-01')).toBe('So'); // Sunday
      expect(pipe.transform('2024-01-01')).toBe('Mo'); // Monday
      expect(pipe.transform('2025-01-01')).toBe('Mi'); // Wednesday
    });
  });

  describe('leap years', () => {
    it('should handle leap year dates correctly', () => {
      expect(pipe.transform('2024-02-29')).toBe('Do'); // Thursday (2024 is leap year)
    });
  });

  describe('real-world usage', () => {
    it('should format dates for monthly plan', () => {
      // Typical usage in monthly-plan component
      const entries = [
        { date: '2024-01-01', expected: 'Mo' },
        { date: '2024-01-02', expected: 'Di' },
        { date: '2024-01-03', expected: 'Mi' },
        { date: '2024-01-04', expected: 'Do' },
        { date: '2024-01-05', expected: 'Fr' },
        { date: '2024-01-06', expected: 'Sa' },
        { date: '2024-01-07', expected: 'So' }
      ];

      entries.forEach(entry => {
        expect(pipe.transform(entry.date)).toBe(entry.expected);
      });
    });

    it('should format dates consistently across a week', () => {
      const week = [
        '2024-01-01', // Mo
        '2024-01-02', // Di
        '2024-01-03', // Mi
        '2024-01-04', // Do
        '2024-01-05', // Fr
        '2024-01-06', // Sa
        '2024-01-07'  // So
      ];

      const expected = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

      week.forEach((date, index) => {
        expect(pipe.transform(date)).toBe(expected[index]);
      });
    });
  });
});
