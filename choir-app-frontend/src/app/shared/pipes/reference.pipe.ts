import { Pipe, PipeTransform } from '@angular/core';

/**
 * Interface for collection reference data.
 */
export interface CollectionReference {
  prefix?: string | null;
  number?: string | number | null;
  singleEdition?: boolean;
}

/**
 * Interface for piece with collection reference data.
 */
export interface PieceWithReference {
  collectionPrefix?: string | null;
  collectionNumber?: string | number | null;
  collections?: Array<{
    prefix?: string | null;
    singleEdition?: boolean;
    collection_piece?: {
      numberInCollection?: string | number | null;
    };
  }>;
  composer?: {
    name?: string | null;
  };
  origin?: string | null;
}

/**
 * Transforms piece or collection reference data into a formatted reference string.
 *
 * @example
 * // In template - Simple prefix and number
 * {{ piece | reference }}
 * // Input: { prefix: "AB", number: "123" }
 * // Output: "AB 123"
 *
 * @example
 * // Complex piece with collections
 * {{ piece | reference }}
 * // Input: { collections: [{ prefix: "AB", collection_piece: { numberInCollection: "123" } }] }
 * // Output: "AB 123"
 *
 * @example
 * // With custom separator
 * {{ piece | reference:'' }}
 * // Input: { prefix: "AB", number: "123" }
 * // Output: "AB123"
 *
 * @example
 * // No reference data
 * {{ piece | reference }}
 * // Input: {}
 * // Output: "-"
 */
@Pipe({
  name: 'reference',
  standalone: true,
  pure: true
})
export class ReferencePipe implements PipeTransform {
  /**
   * Transforms reference data to formatted string.
   *
   * @param value - Object with reference data (simple reference or complex piece)
   * @param separator - String to separate prefix and number (default: ' ')
   * @param fallback - String to return when no reference found (default: '-')
   * @returns Formatted reference string
   */
  transform(
    value: CollectionReference | PieceWithReference | null | undefined,
    separator: string = ' ',
    fallback: string = '-'
  ): string {
    if (!value) {
      return fallback;
    }

    // Check for direct prefix/number properties (simple reference)
    const simpleRef = value as CollectionReference;
    if (simpleRef.prefix && simpleRef.number) {
      return `${simpleRef.prefix}${separator}${simpleRef.number}`;
    }

    // Check for piece-level collection properties
    const piece = value as PieceWithReference;
    if (piece.collectionPrefix && piece.collectionNumber) {
      return `${piece.collectionPrefix}${separator}${piece.collectionNumber}`;
    }

    // Check for collections array
    if (piece.collections && piece.collections.length > 0) {
      const collection = piece.collections[0];
      const numberInCollection = collection.collection_piece?.numberInCollection;

      if (numberInCollection) {
        let prefix = '';

        if (collection.singleEdition) {
          // For single editions, use composer name or origin
          prefix = piece.composer?.name || piece.origin || '';
        } else {
          // For regular collections, use the collection prefix
          prefix = collection.prefix || '';
        }

        return prefix
          ? `${prefix}${separator}${numberInCollection}`
          : `${numberInCollection}`;
      }
    }

    return fallback;
  }
}
