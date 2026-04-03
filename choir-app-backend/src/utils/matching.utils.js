/**
 * Fuzzy matching utilities for detecting piece doublettes
 * Implements Levenshtein distance for similarity scoring
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance (0 = identical, higher = more different)
 */
function levenshteinDistance(a, b) {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Create matrix
  const matrix = Array.from({ length: bLen + 1 }, () => Array(aLen + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= aLen; i++) matrix[0][i] = i;
  for (let j = 0; j <= bLen; j++) matrix[j][0] = j;

  // Fill matrix
  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,      // deletion
        matrix[j - 1][i] + 1,      // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[bLen][aLen];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 * Uses Levenshtein distance normalized by string length
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function stringSimilarity(a, b) {
  if (!a || !b) return 0;

  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 100;

  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(aLower.length, bLower.length);

  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Check if two strings are exact matches (case-insensitive)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
function isExactMatch(a, b) {
  return a && b && a.toLowerCase().trim() === b.toLowerCase().trim();
}

/**
 * Check if one string contains all significant words from another
 * Example: "Ave Maria" vs "Ave" returns true
 * @param {string} haystack - Longer string
 * @param {string} needle - Shorter string
 * @returns {boolean}
 */
function isPartialMatch(haystack, needle) {
  if (!haystack || !needle) return false;

  const haystackWords = haystack.toLowerCase().trim().split(/\s+/);
  const needleWords = needle.toLowerCase().trim().split(/\s+/);

  // All words in needle must be present in haystack (ignoring order)
  return needleWords.every(nWord =>
    haystackWords.some(hWord => hWord === nWord || hWord.includes(nWord))
  );
}

/**
 * Normalize composer name for comparison
 * Handles comma-separated and different ordering
 * Example: "Bach, Johann Sebastian" vs "Johann Sebastian Bach"
 * @param {string} name - Composer name
 * @returns {string} - Normalized name
 */
function normalizeComposerName(name) {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove common prefixes
  normalized = normalized.replace(/^(von|van|de|der|la|le)\s+/i, '');

  // If comma-separated (Last, First), reverse to First Last
  if (normalized.includes(',')) {
    const [last, first] = normalized.split(',').map(s => s.trim());
    normalized = `${first} ${last}`;
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Check if two composers are likely the same person
 * Handles spelling variations and name order
 * @param {string} composerA - First composer name
 * @param {string} composerB - Second composer name
 * @param {number} threshold - Similarity threshold (0-100, default 85)
 * @returns {boolean}
 */
function isComposerMatch(composerA, composerB, threshold = 85) {
  if (!composerA || !composerB) return false;

  // Exact match
  if (isExactMatch(composerA, composerB)) return true;

  // Normalized match
  const normA = normalizeComposerName(composerA);
  const normB = normalizeComposerName(composerB);

  if (normA === normB) return true;

  // Fuzzy match on normalized names
  const similarity = stringSimilarity(normA, normB);
  return similarity >= threshold;
}

/**
 * Get the best matching composer name from a list
 * Returns first name that matches given composer
 * @param {string} composer - Composer to match
 * @param {string[]} composerList - List of composers to search
 * @param {number} threshold - Similarity threshold
 * @returns {string|null} - Matching composer name or null
 */
function findMatchingComposer(composer, composerList, threshold = 85) {
  if (!composer || !composerList || composerList.length === 0) return null;

  return composerList.find(c => isComposerMatch(composer, c, threshold)) || null;
}

/**
 * Compare two pieces and return similarity details
 * @param {Object} pieceA - First piece
 * @param {Object} pieceB - Second piece
 * @param {number} threshold - Similarity threshold (0-100)
 * @returns {Object|null} - Match object with type and score, or null if no match
 *
 * Match types:
 * - EXACT_TITLE: Titles are identical
 * - PARTIAL_TITLE: Both titles contain common words
 * - COMPOSER_MATCH: Same composer with similar/same title
 * - FUZZY_MATCH: High similarity on title, even with minor differences
 */
function comparePieces(pieceA, pieceB, threshold = 80) {
  if (!pieceA || !pieceB || pieceA.id === pieceB.id) return null;

  // Extract data
  const titleA = pieceA.title || '';
  const titleB = pieceB.title || '';
  const composersA = pieceA.composers || [];
  const composersB = pieceB.composers || [];

  // 1. Check exact title match
  if (isExactMatch(titleA, titleB)) {
    return {
      type: 'EXACT_TITLE',
      similarity: 100,
      reasons: ['Identical titles']
    };
  }

  // 2. Check partial title match
  if (isPartialMatch(titleA, titleB) || isPartialMatch(titleB, titleA)) {
    const similarity = Math.max(
      stringSimilarity(titleA, titleB),
      isPartialMatch(titleA, titleB) ? 85 : 0,
      isPartialMatch(titleB, titleA) ? 85 : 0
    );
    if (similarity >= threshold) {
      return {
        type: 'PARTIAL_TITLE',
        similarity,
        reasons: ['Titles share key words']
      };
    }
  }

  // 3. Check composer match with title similarity
  const composerMatches = composersA.some(compA =>
    composersB.some(compB => isComposerMatch(compA, compB))
  );

  if (composerMatches) {
    const titleSim = stringSimilarity(titleA, titleB);
    if (titleSim >= threshold - 10) { // Slightly lower threshold for composer match
      return {
        type: 'COMPOSER_MATCH',
        similarity: Math.max(titleSim, 75),
        reasons: ['Same composer with similar title']
      };
    }
  }

  // 4. Check fuzzy match on title alone
  const titleSimilarity = stringSimilarity(titleA, titleB);
  if (titleSimilarity >= threshold) {
    return {
      type: 'FUZZY_MATCH',
      similarity: titleSimilarity,
      reasons: ['High title similarity']
    };
  }

  return null;
}

/**
 * Find all doublette candidates for a piece against a list
 * @param {Object} piece - Piece to check
 * @param {Object[]} allPieces - All pieces to compare against
 * @param {number} threshold - Similarity threshold (0-100)
 * @returns {Object[]} - Array of matching pieces with scores, sorted by similarity
 */
function findDoubletteCandidates(piece, allPieces, threshold = 80) {
  const matches = [];

  for (const otherPiece of allPieces) {
    const match = comparePieces(piece, otherPiece, threshold);
    if (match) {
      matches.push({
        ...match,
        piece: otherPiece
      });
    }
  }

  // Sort by similarity descending
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Group pieces by doublette candidates
 * Removes duplicate groups (A->B is same as B->A)
 * @param {Object[]} pieces - All pieces
 * @param {number} threshold - Similarity threshold
 * @returns {Object[]} - Array of doublette groups
 */
function groupDoublettes(pieces, threshold = 80) {
  const groups = [];
  const seenPairIds = new Set();

  for (const piece of pieces) {
    const candidates = findDoubletteCandidates(piece, pieces, threshold);

    if (candidates.length > 0) {
      // Avoid duplicate groups
      const pairKey = [piece.id, candidates[0].piece.id].sort().join('-');

      if (!seenPairIds.has(pairKey)) {
        seenPairIds.add(pairKey);
        groups.push({
          candidates: [
            { ...piece, similarity: 100 },
            ...candidates.map(m => ({
              ...m.piece,
              similarity: m.similarity,
              matchType: m.type,
              reasons: m.reasons
            }))
          ],
          matchType: candidates[0].type
        });
      }
    }
  }

  return groups;
}

module.exports = {
  levenshteinDistance,
  stringSimilarity,
  isExactMatch,
  isPartialMatch,
  normalizeComposerName,
  isComposerMatch,
  findMatchingComposer,
  comparePieces,
  findDoubletteCandidates,
  groupDoublettes
};
