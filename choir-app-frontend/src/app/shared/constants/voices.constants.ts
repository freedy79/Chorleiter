/**
 * Voice/Choir part constants for handling different voice name variations.
 * Consolidates voice naming logic used across the application.
 */

/**
 * Standard order of choir voice sections for sorting and display.
 * Ordered from highest to lowest voices.
 */
export const VOICE_ORDER = ['SOPRAN', 'ALT', 'TENOR', 'BASS'] as const;

/**
 * Maps various voice name variations to standardized display names.
 * Handles different naming conventions (e.g., "Sopran I", "Sopran 1", "SOPRAN I").
 */
export const VOICE_DISPLAY_MAP: Record<string, string> = {
  'SOPRAN I': 'Sopran I',
  'SOPRAN 1': 'Sopran I',
  'SOPRAN II': 'Sopran II',
  'SOPRAN 2': 'Sopran II',
  SOPRAN: 'Sopran',
  SOPRANO: 'Sopran',
  'ALT I': 'Alt I',
  'ALT 1': 'Alt I',
  'ALT II': 'Alt II',
  'ALT 2': 'Alt II',
  ALT: 'Alt',
  ALTO: 'Alt',
  'TENOR I': 'Tenor I',
  'TENOR 1': 'Tenor I',
  'TENOR II': 'Tenor II',
  'TENOR 2': 'Tenor II',
  TENOR: 'Tenor',
  'BASS I': 'Bass I',
  'BASS 1': 'Bass I',
  'BASS II': 'Bass II',
  'BASS 2': 'Bass II',
  BASS: 'Bass',
};

/**
 * Maps specific voice subdivisions to their base voice section.
 * Used for grouping and sorting voices (e.g., "Sopran I" -> "SOPRAN").
 */
export const BASE_VOICE_MAP: Record<string, string> = {
  'SOPRAN I': 'SOPRAN',
  'SOPRAN 1': 'SOPRAN',
  'SOPRAN II': 'SOPRAN',
  'SOPRAN 2': 'SOPRAN',
  SOPRAN: 'SOPRAN',
  SOPRANO: 'SOPRAN',
  'ALT I': 'ALT',
  'ALT 1': 'ALT',
  'ALT II': 'ALT',
  'ALT 2': 'ALT',
  ALT: 'ALT',
  ALTO: 'ALT',
  'TENOR I': 'TENOR',
  'TENOR 1': 'TENOR',
  'TENOR II': 'TENOR',
  'TENOR 2': 'TENOR',
  TENOR: 'TENOR',
  'BASS I': 'BASS',
  'BASS 1': 'BASS',
  'BASS II': 'BASS',
  'BASS 2': 'BASS',
  BASS: 'BASS',
};

/**
 * Type representing valid voice section names.
 */
export type VoiceSection = typeof VOICE_ORDER[number];
