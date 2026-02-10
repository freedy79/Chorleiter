import { PersonNamePipe, Person } from './person-name.pipe';

describe('PersonNamePipe', () => {
  let pipe: PersonNamePipe;

  beforeEach(() => {
    pipe = new PersonNamePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('lastFirst format (default)', () => {
    it('should format with both names', () => {
      const person: Person = { name: 'Müller', firstName: 'Hans' };
      expect(pipe.transform(person)).toBe('Müller, Hans');
    });

    it('should format with last name only', () => {
      const person: Person = { name: 'Müller' };
      expect(pipe.transform(person)).toBe('Müller');
    });

    it('should format with first name only', () => {
      const person: Person = { firstName: 'Hans' };
      expect(pipe.transform(person)).toBe('Hans');
    });

    it('should handle different names', () => {
      expect(pipe.transform({ name: 'Schmidt', firstName: 'Anna' })).toBe('Schmidt, Anna');
      expect(pipe.transform({ name: 'Weber', firstName: 'Peter' })).toBe('Weber, Peter');
      expect(pipe.transform({ name: 'Schneider', firstName: 'Maria' })).toBe('Schneider, Maria');
    });
  });

  describe('firstLast format', () => {
    it('should format with both names', () => {
      const person: Person = { name: 'Müller', firstName: 'Hans' };
      expect(pipe.transform(person, 'firstLast')).toBe('Hans Müller');
    });

    it('should format with last name only', () => {
      const person: Person = { name: 'Müller' };
      expect(pipe.transform(person, 'firstLast')).toBe('Müller');
    });

    it('should format with first name only', () => {
      const person: Person = { firstName: 'Hans' };
      expect(pipe.transform(person, 'firstLast')).toBe('Hans');
    });
  });

  describe('lastOnly format', () => {
    it('should return only last name when both present', () => {
      const person: Person = { name: 'Müller', firstName: 'Hans' };
      expect(pipe.transform(person, 'lastOnly')).toBe('Müller');
    });

    it('should return last name when only last name present', () => {
      const person: Person = { name: 'Müller' };
      expect(pipe.transform(person, 'lastOnly')).toBe('Müller');
    });

    it('should return empty string when only first name present', () => {
      const person: Person = { firstName: 'Hans' };
      expect(pipe.transform(person, 'lastOnly')).toBe('');
    });
  });

  describe('firstOnly format', () => {
    it('should return only first name when both present', () => {
      const person: Person = { name: 'Müller', firstName: 'Hans' };
      expect(pipe.transform(person, 'firstOnly')).toBe('Hans');
    });

    it('should return empty string when only last name present', () => {
      const person: Person = { name: 'Müller' };
      expect(pipe.transform(person, 'firstOnly')).toBe('');
    });

    it('should return first name when only first name present', () => {
      const person: Person = { firstName: 'Hans' };
      expect(pipe.transform(person, 'firstOnly')).toBe('Hans');
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

    it('should return empty string when both fields are null', () => {
      const person: Person = { name: null, firstName: null };
      expect(pipe.transform(person)).toBe('');
    });

    it('should return empty string when both fields are undefined', () => {
      const person: Person = { name: undefined, firstName: undefined };
      expect(pipe.transform(person)).toBe('');
    });

    it('should return empty string when both fields are empty strings', () => {
      const person: Person = { name: '', firstName: '' };
      expect(pipe.transform(person)).toBe('');
    });

    it('should trim whitespace from names', () => {
      const person: Person = { name: '  Müller  ', firstName: '  Hans  ' };
      expect(pipe.transform(person)).toBe('Müller, Hans');
    });

    it('should handle only whitespace as empty', () => {
      const person: Person = { name: '   ', firstName: '   ' };
      expect(pipe.transform(person)).toBe('');
    });
  });

  describe('special characters and international names', () => {
    it('should handle German umlauts', () => {
      expect(pipe.transform({ name: 'Müller', firstName: 'Jürgen' })).toBe('Müller, Jürgen');
      expect(pipe.transform({ name: 'Schröder', firstName: 'Jörg' })).toBe('Schröder, Jörg');
    });

    it('should handle hyphenated names', () => {
      expect(pipe.transform({ name: 'Meyer-Schmidt', firstName: 'Hans-Peter' })).toBe('Meyer-Schmidt, Hans-Peter');
    });

    it('should handle apostrophes', () => {
      expect(pipe.transform({ name: "O'Brien", firstName: 'Patrick' })).toBe("O'Brien, Patrick");
    });

    it('should handle names with spaces', () => {
      expect(pipe.transform({ name: 'van der Berg', firstName: 'Jan' })).toBe('van der Berg, Jan');
    });
  });

  describe('real-world examples', () => {
    it('should format typical German names', () => {
      expect(pipe.transform({ name: 'Becker', firstName: 'Thomas' })).toBe('Becker, Thomas');
      expect(pipe.transform({ name: 'Fischer', firstName: 'Julia' })).toBe('Fischer, Julia');
      expect(pipe.transform({ name: 'Wagner', firstName: 'Michael' })).toBe('Wagner, Michael');
    });

    it('should handle composer names for display', () => {
      expect(pipe.transform({ name: 'Bach', firstName: 'Johann Sebastian' })).toBe('Bach, Johann Sebastian');
      expect(pipe.transform({ name: 'Mozart', firstName: 'Wolfgang Amadeus' })).toBe('Mozart, Wolfgang Amadeus');
      expect(pipe.transform({ name: 'Beethoven', firstName: 'Ludwig van' })).toBe('Beethoven, Ludwig van');
    });
  });
});
