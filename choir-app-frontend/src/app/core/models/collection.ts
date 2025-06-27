import { Piece } from './piece';

/**
 * Represents a collection of musical pieces.
 * This is a global entity, not tied to a specific choir.
 */
export interface Collection {
  /**
   * The unique identifier for the collection.
   */
  id: number;

  /**
   * The official title of the collection (e.g., "Chorbuch Gotteslob", "Carols for Choirs").
   */
  title: string;

  /**
   * The publisher of the collection (e.g., "Carus-Verlag", "Oxford University Press").
   * This is optional.
   */
  publisher?: string;

  /**
   * A short prefix or abbreviation for the collection (e.g., "GL", "CFC", "EG").
   * This is optional.
   */
  prefix?: string;

  /**
   * An optional array of Piece objects that are part of this collection.
   * This property may or may not be present depending on the API call.
   * For example, it would be included when fetching a single collection's details,
   * but might be omitted when fetching a simple list of all collections.
   */
  pieces?: Piece[];

  isAdded?: boolean;

  pieceCount?: number;

  /** Filename of the uploaded cover image */
  coverImage?: string;
}
