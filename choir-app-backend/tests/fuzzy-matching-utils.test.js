const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const controller = require('../src/controllers/import.controller');

/**
 * Unit tests for fuzzy matching utility functions
 *
 * Tests the core fuzzy matching algorithms:
 * - tokenize: Splits strings into searchable tokens
 * - similarityScore: Calculates similarity between strings
 * - rankCandidates: Ranks and filters candidates by similarity
 */
(async () => {
  try {
    console.log('Starting fuzzy matching utility tests...\n');

    const { tokenize, similarityScore, rankCandidates } = controller._test;

    // ======================
    // Test tokenize function
    // ======================
    console.log('Test 1: tokenize function');

    assert.deepStrictEqual(
      tokenize('Bach, Johann Sebastian'),
      ['bach', 'johann', 'sebastian'],
      'Should tokenize comma-separated name'
    );

    assert.deepStrictEqual(
      tokenize('Vaughan Williams'),
      ['vaughan', 'williams'],
      'Should tokenize space-separated name'
    );

    assert.deepStrictEqual(
      tokenize('J. S. Bach'),
      ['j.', 's.', 'bach'],
      'Should tokenize abbreviated name'
    );

    assert.deepStrictEqual(
      tokenize('multi  space   test'),
      ['multi', 'space', 'test'],
      'Should handle multiple spaces'
    );

    assert.deepStrictEqual(
      tokenize(''),
      [],
      'Should handle empty string'
    );

    console.log('✓ tokenize function works correctly\n');

    // ======================
    // Test similarityScore function
    // ======================
    console.log('Test 2: similarityScore function');

    // Exact match
    assert.strictEqual(
      similarityScore('Bach', 'Bach'),
      1,
      'Exact match should score 1.0'
    );

    // Case insensitive exact match
    assert.strictEqual(
      similarityScore('bach', 'BACH'),
      1,
      'Case insensitive exact match should score 1.0'
    );

    // Substring match
    const substringScore = similarityScore('Bach', 'Bach, Johann Sebastian');
    assert.ok(
      substringScore >= 0.9,
      `Substring match should score >= 0.9, got ${substringScore}`
    );

    // Token-based match
    const tokenScore1 = similarityScore('Johann Bach', 'Bach, Johann Sebastian');
    assert.ok(
      tokenScore1 >= 0.85,
      `Token match should score well, got ${tokenScore1}`
    );

    // Similar but not exact
    const similarScore = similarityScore('Rachmaninoff', 'Rachmaninov');
    assert.ok(
      similarScore >= 0.7 && similarScore < 1.0,
      `Similar names should score between 0.7-1.0, got ${similarScore}`
    );

    // Completely different
    const differentScore = similarityScore('Bach', 'Mozart');
    assert.ok(
      differentScore < 0.5,
      `Different names should score low, got ${differentScore}`
    );

    // Empty strings
    assert.strictEqual(
      similarityScore('', ''),
      0,
      'Empty strings should score 0'
    );

    assert.strictEqual(
      similarityScore('Bach', ''),
      0,
      'Empty comparison should score 0'
    );

    // Partial token match
    const partialScore = similarityScore('Bach', 'Bach, Carl Philipp Emanuel');
    assert.ok(
      partialScore >= 0.85,
      `Partial token match should score well, got ${partialScore}`
    );

    // Abbreviation-like match
    const abbrScore = similarityScore('J S Bach', 'Johann Sebastian Bach');
    assert.ok(
      abbrScore >= 0.7,
      `Abbreviation-like match should score reasonably, got ${abbrScore}`
    );

    console.log('✓ similarityScore function works correctly\n');

    // ======================
    // Test rankCandidates function
    // ======================
    console.log('Test 3: rankCandidates function');

    const candidates = [
      { name: 'Bach, Johann Sebastian' },
      { name: 'Bach, Carl Philipp Emanuel' },
      { name: 'Mozart, Wolfgang Amadeus' },
      { name: 'Rutter, John' },
      { name: 'Rachmaninoff, Sergei' }
    ];

    // Test ranking for "Bach"
    const bachResults = rankCandidates('Bach', candidates, c => c.name, { minScore: 0.6, maxResults: 10 });
    assert.ok(bachResults.length >= 2, 'Should find multiple Bach matches');
    assert.ok(
      bachResults[0].candidate.name.includes('Bach'),
      'Top result should be a Bach'
    );
    assert.ok(
      bachResults.every(r => r.score >= 0.6),
      'All results should meet minScore threshold'
    );
    assert.ok(
      bachResults[0].score >= bachResults[bachResults.length - 1].score,
      'Results should be sorted by score descending'
    );

    // Test ranking for "Johann"
    const johannResults = rankCandidates('Johann', candidates, c => c.name, { minScore: 0.6, maxResults: 10 });
    assert.ok(
      johannResults.some(r => r.candidate.name === 'Bach, Johann Sebastian'),
      'Should find Johann Sebastian Bach'
    );

    // Test maxResults limit
    const limitedResults = rankCandidates('a', candidates, c => c.name, { minScore: 0.1, maxResults: 2 });
    assert.ok(
      limitedResults.length <= 2,
      `Should respect maxResults limit, got ${limitedResults.length}`
    );

    // Test minScore threshold
    const highThresholdResults = rankCandidates('xyz', candidates, c => c.name, { minScore: 0.9, maxResults: 10 });
    assert.strictEqual(
      highThresholdResults.length,
      0,
      'Should find no results with very high threshold for irrelevant search'
    );

    // Test exact match ranking
    const exactResults = rankCandidates('Rutter, John', candidates, c => c.name, { minScore: 0.6, maxResults: 10 });
    assert.ok(exactResults.length > 0, 'Should find exact match');
    assert.strictEqual(
      exactResults[0].candidate.name,
      'Rutter, John',
      'Exact match should be top result'
    );
    assert.ok(
      exactResults[0].score >= 0.95,
      `Exact match should have very high score, got ${exactResults[0].score}`
    );

    console.log('✓ rankCandidates function works correctly\n');

    // ======================
    // Test edge cases
    // ======================
    console.log('Test 4: Edge cases');

    // Unicode and special characters
    const unicodeScore = similarityScore('Dvořák', 'Dvorak');
    assert.ok(
      unicodeScore >= 0.6,
      `Should handle unicode characters, got ${unicodeScore}`
    );

    // Very long names
    const longName1 = 'This is a very long composer name with many words';
    const longName2 = 'This is a very long composer name with different words';
    const longScore = similarityScore(longName1, longName2);
    assert.ok(
      longScore >= 0.5 && longScore < 0.95,
      `Long similar strings should score moderately, got ${longScore}`
    );

    // Single character
    const singleCharScore = similarityScore('B', 'Bach');
    assert.ok(
      singleCharScore >= 0.5,
      `Single character prefix should match, got ${singleCharScore}`
    );

    // Numbers in names
    const numberScore = similarityScore('Symphony No. 5', 'Symphony No. 5 in C minor');
    assert.ok(
      numberScore >= 0.8,
      `Should handle numbers in names, got ${numberScore}`
    );

    console.log('✓ Edge cases handled correctly\n');

    // ======================
    // Test performance characteristics
    // ======================
    console.log('Test 5: Performance characteristics');

    // Test that algorithm prioritizes complete token matches
    const tokenPriorityResults = rankCandidates(
      'Sebastian Bach',
      [
        { name: 'Bach, Johann Sebastian' },
        { name: 'Sebastian, Johann' },
        { name: 'Brahms, Johannes' }
      ],
      c => c.name,
      { minScore: 0.6, maxResults: 10 }
    );

    assert.ok(
      tokenPriorityResults.length > 0,
      'Should find token matches'
    );
    assert.ok(
      tokenPriorityResults[0].candidate.name.includes('Sebastian') &&
      tokenPriorityResults[0].candidate.name.includes('Bach'),
      'Should prioritize candidates with all tokens'
    );

    console.log('✓ Performance characteristics verified\n');

    console.log('\n✓ All fuzzy matching utility tests passed successfully!');
  } catch (err) {
    console.error('\n✗ Test failed:', err);
    process.exit(1);
  }
})();
