import { ReferencePipe, CollectionReference, PieceWithReference } from './reference.pipe';

describe('ReferencePipe', () => {
  let pipe: ReferencePipe;

  beforeEach(() => {
    pipe = new ReferencePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('simple reference format', () => {
    it('should format basic prefix and number', () => {
      const ref: CollectionReference = { prefix: 'AB', number: '123' };
      expect(pipe.transform(ref)).toBe('AB 123');
    });

    it('should format with different prefixes and numbers', () => {
      expect(pipe.transform({ prefix: 'XY', number: '456' })).toBe('XY 456');
      expect(pipe.transform({ prefix: 'CD', number: '789' })).toBe('CD 789');
      expect(pipe.transform({ prefix: 'EF', number: '012' })).toBe('EF 012');
    });

    it('should format with numeric number', () => {
      const ref: CollectionReference = { prefix: 'AB', number: 123 };
      expect(pipe.transform(ref)).toBe('AB 123');
    });

    it('should use custom separator', () => {
      const ref: CollectionReference = { prefix: 'AB', number: '123' };
      expect(pipe.transform(ref, '')).toBe('AB123');
      expect(pipe.transform(ref, '-')).toBe('AB-123');
      expect(pipe.transform(ref, ':')).toBe('AB:123');
    });
  });

  describe('piece with collectionPrefix/collectionNumber', () => {
    it('should format piece-level collection properties', () => {
      const piece: PieceWithReference = {
        collectionPrefix: 'AB',
        collectionNumber: '123'
      };
      expect(pipe.transform(piece)).toBe('AB 123');
    });

    it('should prefer piece-level properties over collections array', () => {
      const piece: PieceWithReference = {
        collectionPrefix: 'AB',
        collectionNumber: '123',
        collections: [{
          prefix: 'XY',
          collection_piece: { numberInCollection: '456' }
        }]
      };
      expect(pipe.transform(piece)).toBe('AB 123');
    });
  });

  describe('piece with collections array', () => {
    it('should format from collections array with regular prefix', () => {
      const piece: PieceWithReference = {
        collections: [{
          prefix: 'AB',
          singleEdition: false,
          collection_piece: { numberInCollection: '123' }
        }]
      };
      expect(pipe.transform(piece)).toBe('AB 123');
    });

    it('should format single edition with composer name', () => {
      const piece: PieceWithReference = {
        collections: [{
          singleEdition: true,
          collection_piece: { numberInCollection: '123' }
        }],
        composer: { name: 'Bach' }
      };
      expect(pipe.transform(piece)).toBe('Bach 123');
    });

    it('should format single edition with origin when no composer', () => {
      const piece: PieceWithReference = {
        collections: [{
          singleEdition: true,
          collection_piece: { numberInCollection: '123' }
        }],
        origin: 'German Folk Song'
      };
      expect(pipe.transform(piece)).toBe('German Folk Song 123');
    });

    it('should format single edition without prefix if no composer or origin', () => {
      const piece: PieceWithReference = {
        collections: [{
          singleEdition: true,
          collection_piece: { numberInCollection: '123' }
        }]
      };
      expect(pipe.transform(piece)).toBe('123');
    });

    it('should handle numeric numberInCollection', () => {
      const piece: PieceWithReference = {
        collections: [{
          prefix: 'AB',
          collection_piece: { numberInCollection: 123 }
        }]
      };
      expect(pipe.transform(piece)).toBe('AB 123');
    });

    it('should use first collection from array', () => {
      const piece: PieceWithReference = {
        collections: [
          {
            prefix: 'AB',
            collection_piece: { numberInCollection: '123' }
          },
          {
            prefix: 'XY',
            collection_piece: { numberInCollection: '456' }
          }
        ]
      };
      expect(pipe.transform(piece)).toBe('AB 123');
    });
  });

  describe('fallback behavior', () => {
    it('should return default fallback "-" when no reference data', () => {
      expect(pipe.transform({})).toBe('-');
      expect(pipe.transform({ collections: [] })).toBe('-');
    });

    it('should return custom fallback when provided', () => {
      expect(pipe.transform({}, ' ', 'N/A')).toBe('N/A');
      expect(pipe.transform({}, ' ', '')).toBe('');
      expect(pipe.transform({}, ' ', '—')).toBe('—');
    });

    it('should return fallback for null', () => {
      expect(pipe.transform(null)).toBe('-');
    });

    it('should return fallback for undefined', () => {
      expect(pipe.transform(undefined)).toBe('-');
    });

    it('should return fallback when prefix exists but number is missing', () => {
      expect(pipe.transform({ prefix: 'AB' })).toBe('-');
    });

    it('should return fallback when number exists but prefix is missing', () => {
      expect(pipe.transform({ number: '123' })).toBe('-');
    });
  });

  describe('edge cases', () => {
    it('should handle empty collections array', () => {
      const piece: PieceWithReference = { collections: [] };
      expect(pipe.transform(piece)).toBe('-');
    });

    it('should handle collection without collection_piece', () => {
      const piece: PieceWithReference = {
        collections: [{ prefix: 'AB' }]
      };
      expect(pipe.transform(piece)).toBe('-');
    });

    it('should handle collection_piece without numberInCollection', () => {
      const piece: PieceWithReference = {
        collections: [{
          prefix: 'AB',
          collection_piece: {}
        }]
      };
      expect(pipe.transform(piece)).toBe('-');
    });

    it('should handle null values in nested objects', () => {
      const piece: PieceWithReference = {
        collectionPrefix: null,
        collectionNumber: null,
        collections: [{
          prefix: null,
          collection_piece: { numberInCollection: null }
        }]
      };
      expect(pipe.transform(piece)).toBe('-');
    });
  });

  describe('real-world scenarios', () => {
    it('should format typical choir book references', () => {
      expect(pipe.transform({ prefix: 'EG', number: '243' })).toBe('EG 243');
      expect(pipe.transform({ prefix: 'GL', number: '456' })).toBe('GL 456');
      expect(pipe.transform({ prefix: 'KG', number: '789' })).toBe('KG 789');
    });

    it('should format references without spaces', () => {
      expect(pipe.transform({ prefix: 'AB', number: '123' }, '')).toBe('AB123');
    });

    it('should handle complex piece from literature list', () => {
      const piece: PieceWithReference = {
        collectionPrefix: 'EG',
        collectionNumber: '243'
      };
      expect(pipe.transform(piece)).toBe('EG 243');
    });
  });
});
