import { JoinPipe } from './join.pipe';

describe('JoinPipe', () => {
  let pipe: JoinPipe;

  beforeEach(() => {
    pipe = new JoinPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('joining objects by property', () => {
    it('should join array of objects by property name', () => {
      const choirs = [
        { name: 'Choir A' },
        { name: 'Choir B' },
        { name: 'Choir C' }
      ];
      expect(pipe.transform(choirs, 'name')).toBe('Choir A, Choir B, Choir C');
    });

    it('should use custom separator', () => {
      const choirs = [
        { name: 'Choir A' },
        { name: 'Choir B' }
      ];
      expect(pipe.transform(choirs, 'name', ' | ')).toBe('Choir A | Choir B');
      expect(pipe.transform(choirs, 'name', ' - ')).toBe('Choir A - Choir B');
      expect(pipe.transform(choirs, 'name', '; ')).toBe('Choir A; Choir B');
    });

    it('should handle single item array', () => {
      const choirs = [{ name: 'Choir A' }];
      expect(pipe.transform(choirs, 'name')).toBe('Choir A');
    });

    it('should filter out null/undefined property values', () => {
      const choirs = [
        { name: 'Choir A' },
        { name: null },
        { name: 'Choir B' },
        { name: undefined },
        { name: 'Choir C' }
      ];
      expect(pipe.transform(choirs, 'name')).toBe('Choir A, Choir B, Choir C');
    });

    it('should filter out empty string property values', () => {
      const choirs = [
        { name: 'Choir A' },
        { name: '' },
        { name: 'Choir B' }
      ];
      expect(pipe.transform(choirs, 'name')).toBe('Choir A, Choir B');
    });

    it('should handle nested properties', () => {
      const items = [
        { user: { name: 'Alice' } },
        { user: { name: 'Bob' } }
      ];
      // Note: This won't work with nested properties like 'user.name'
      // It only supports direct properties
      expect(pipe.transform(items, 'user')).toBe('[object Object], [object Object]');
    });

    it('should handle objects with missing property', () => {
      const items = [
        { name: 'Item A' },
        { otherProp: 'value' },
        { name: 'Item B' }
      ];
      expect(pipe.transform(items, 'name')).toBe('Item A, Item B');
    });
  });

  describe('joining primitive arrays', () => {
    it('should join array of strings without property', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      expect(pipe.transform(tags)).toBe('tag1, tag2, tag3');
    });

    it('should join array of numbers', () => {
      const numbers = [1, 2, 3, 4, 5];
      expect(pipe.transform(numbers)).toBe('1, 2, 3, 4, 5');
    });

    it('should use custom separator for primitives', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      expect(pipe.transform(tags, undefined, ' | ')).toBe('tag1 | tag2 | tag3');
      expect(pipe.transform(tags, undefined, '-')).toBe('tag1-tag2-tag3');
    });

    it('should filter out null/undefined values from primitive array', () => {
      const values = ['value1', null, 'value2', undefined, 'value3'];
      expect(pipe.transform(values)).toBe('value1, value2, value3');
    });

    it('should filter out empty strings from primitive array', () => {
      const values = ['value1', '', 'value2', '', 'value3'];
      expect(pipe.transform(values)).toBe('value1, value2, value3');
    });

    it('should handle mixed type primitive array', () => {
      const values = ['string', 42, true, false];
      expect(pipe.transform(values)).toBe('string, 42, true, false');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null', () => {
      expect(pipe.transform(null, 'name')).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(pipe.transform(undefined, 'name')).toBe('');
    });

    it('should return empty string for empty array', () => {
      expect(pipe.transform([], 'name')).toBe('');
    });

    it('should return empty string for non-array values', () => {
      expect(pipe.transform({} as any, 'name')).toBe('');
      expect(pipe.transform('string' as any, 'name')).toBe('');
      expect(pipe.transform(123 as any, 'name')).toBe('');
    });

    it('should return empty string when all values are filtered out', () => {
      const choirs = [
        { name: null },
        { name: undefined },
        { name: '' }
      ];
      expect(pipe.transform(choirs, 'name')).toBe('');
    });

    it('should handle array with single null value', () => {
      expect(pipe.transform([null])).toBe('');
    });

    it('should handle zero as valid value', () => {
      const numbers = [0, 1, 2];
      expect(pipe.transform(numbers)).toBe('0, 1, 2');
    });

    it('should handle false as valid value', () => {
      const booleans = [true, false, true];
      expect(pipe.transform(booleans)).toBe('true, false, true');
    });
  });

  describe('real-world usage', () => {
    it('should format choir list for user display', () => {
      const user = {
        choirs: [
          { name: 'Kirchenchor St. Maria' },
          { name: 'Jugendchor' },
          { name: 'Projektchor' }
        ]
      };
      expect(pipe.transform(user.choirs, 'name')).toBe('Kirchenchor St. Maria, Jugendchor, Projektchor');
    });

    it('should format choir list with custom separator', () => {
      const user = {
        choirs: [
          { name: 'Choir A' },
          { name: 'Choir B' }
        ]
      };
      expect(pipe.transform(user.choirs, 'name', ' / ')).toBe('Choir A / Choir B');
    });

    it('should handle user with no choirs gracefully', () => {
      const user = { choirs: [] };
      expect(pipe.transform(user.choirs, 'name')).toBe('');
    });

    it('should format tags or categories', () => {
      const piece = {
        tags: ['Advent', 'Weihnachten', 'Klassik']
      };
      expect(pipe.transform(piece.tags)).toBe('Advent, Weihnachten, Klassik');
    });

    it('should format multiple authors or composers', () => {
      const piece = {
        authors: [
          { name: 'Bach' },
          { name: 'Mozart' },
          { name: 'Beethoven' }
        ]
      };
      expect(pipe.transform(piece.authors, 'name')).toBe('Bach, Mozart, Beethoven');
    });
  });

  describe('special characters', () => {
    it('should handle special characters in values', () => {
      const items = [
        { name: 'Name & Co.' },
        { name: 'Test "Quoted"' },
        { name: "O'Brien" }
      ];
      expect(pipe.transform(items, 'name')).toBe('Name & Co., Test "Quoted", O\'Brien');
    });

    it('should handle umlauts and special characters', () => {
      const choirs = [
        { name: 'Chor Zürich' },
        { name: 'Männerchor München' },
        { name: 'Frauenchor Köln' }
      ];
      expect(pipe.transform(choirs, 'name')).toBe('Chor Zürich, Männerchor München, Frauenchor Köln');
    });
  });

  describe('performance considerations', () => {
    it('should handle large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ name: `Item ${i}` }));
      const result = pipe.transform(largeArray, 'name');
      expect(result).toContain('Item 0');
      expect(result).toContain('Item 999');
      expect(result.split(', ').length).toBe(1000);
    });
  });
});
