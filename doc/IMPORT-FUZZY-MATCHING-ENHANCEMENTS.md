# Import Fuzzy Matching Enhancements

## Overview

Enhanced the import dialog for collection pieces to allow users to select from existing composers and titles with improved fuzzy matching that separates names by spaces to find appropriate candidates.

## Implementation Date
February 10, 2026

## Features Implemented

### 1. Enhanced Token-Based Fuzzy Matching

**Location:** `choir-app-backend/src/controllers/import.controller.js`

#### New `tokenize()` Function
- Splits strings into space and comma-separated tokens
- Converts to lowercase for case-insensitive matching
- Filters out empty tokens

#### Enhanced `similarityScore()` Function
- Exact match: score = 1.0
- Substring match: score = 0.95
- **Token-based matching** (NEW):
  - Matches individual tokens between input and candidate
  - Supports prefix matching (e.g., "Bach" matches "Bach, Johann Sebastian")
  - Fuzzy matching for longer tokens (≥3 characters, 80% similarity threshold)
  - All input tokens matched: score = 0.9
  - Partial token match: score = 0.7 + (matched/total * 0.15)
- Levenshtein distance fallback for non-token matches

#### Updated `rankCandidates()` Function
- Configurable `minScore` threshold (default: 0.6)
- Configurable `maxResults` limit (default: 10)
- Returns sorted list of candidates with similarity scores
- More permissive than previous 0.75 threshold

### 2. Always Provide Selection Options

#### Composer Matching (`findComposerMatch`)
**Previous Behavior:**
- Only returned options when ambiguous
- Exact matches provided no selection options

**New Behavior:**
- Always returns top candidates with similarity scores
- Even exact matches are presented as selectable options
- User can confirm the match or choose an alternative
- Option to create new composer even when matches exist
- Searches both by last name AND through all composers for better coverage

#### Piece/Title Matching (`findPieceMatch`)
**Previous Behavior:**
- Only returned options when ambiguous

**New Behavior:**
- Always returns top candidates with similarity scores
- Tokenizes title for better partial matching
- When composer is known, searches:
  1. Pieces matching title tokens
  2. All pieces by the same composer
- Combines and deduplicates results for comprehensive matching

### 3. User Selection Interface

#### Frontend Changes (`import-dialog.component.html`)

**Composer Selection:**
```html
<mat-select placeholder="Komponist wählen">
  <mat-option [value]="-1">
    <em>Neuen Komponisten anlegen</em>
  </mat-option>
  <mat-option *ngFor="let opt of row.composerOptions" [value]="opt.id">
    {{ opt.name }} <span class="score-badge">({{ opt.score | number:'1.2-2' }})</span>
  </mat-option>
</mat-select>
```

**Title Selection:**
```html
<mat-select placeholder="Titel wählen">
  <mat-option [value]="-1">
    <em>Neues Stück anlegen</em>
  </mat-option>
  <mat-option *ngFor="let opt of row.titleOptions" [value]="opt.id">
    {{ opt.title }}{{ opt.composerName ? ' — ' + opt.composerName : '' }}
    <span class="score-badge">({{ opt.score | number:'1.2-2' }})</span>
  </mat-option>
</mat-select>
```

**Features:**
- Always shows dropdown when options are available
- Displays similarity scores for transparency
- First option in new entity creation (-1 value)
- Visual score badges styled for both light and dark modes

#### TypeScript Changes (`import-dialog.component.ts`)

**New Resolution Flags:**
- `createNewComposer`: Boolean flag to explicitly create new composer
- `createNewPiece`: Boolean flag to explicitly create new piece

**Updated Methods:**
- `getComposerSelection()`: Returns -1 for new composer, otherwise selected ID
- `getTitleSelection()`: Returns -1 for new piece, otherwise selected ID
- `onComposerSelection()`: Handles user selection including "create new" option
- `onTitleSelection()`: Handles user selection including "create new" option
- `initializeResolutions()`: Pre-fills best matches for user convenience
- `isRowResolved()`: Updated to check for explicit creation flags

#### Styling (`import-dialog.component.scss`)

**New Styles:**
```scss
.score-badge {
  color: #666;
  font-size: 0.95rem;
  font-style: italic;
  margin-left: 4px;
}

@media (prefers-color-scheme: dark) {
  .score-badge {
    color: #aaa;
  }
}
```

### 4. Backend Processing

**Updated `processImport()` Function:**

```javascript
if (resolution.createNewComposer) {
    // User explicitly wants to create a new composer
    const formattedName = formatPersonName(composerName);
    composer = await findOrCreatePerson(db.composer, formattedName, job.id, 'Composer');
    jobs.updateJobLog(job.id, `Composer created by user request: ${composer.name}.`);
} else if (resolution.composerId) {
    // User selected an existing composer
    composer = await db.composer.findByPk(resolution.composerId);
    jobs.updateJobLog(job.id, `Composer resolved by user: ${composer.name}.`);
} else {
    // Automatic matching
    //... existing logic
}
```

## Test Coverage

### Unit Tests (`fuzzy-matching-utils.test.js`)

1. **tokenize Function Tests**
   - Comma-separated names: `"Bach, Johann Sebastian"` → `['bach', 'johann', 'sebastian']`
   - Space-separated names: `"Vaughan Williams"` → `['vaughan', 'williams']`
   - Abbreviated names: `"J. S. Bach"` → `['j.', 's.', 'bach']`
   - Multiple spaces handling
   - Empty string handling

2. **similarityScore Function Tests**
   - Exact match (score = 1.0)
   - Case insensitive exact match
   - Substring matches (score ≥ 0.9)
   - Token-based matches
   - Similar but not exact (0.7-1.0)
   - Completely different strings (< 0.5)
   - Empty strings
   - Partial token matches
   - Abbreviation-like matches

3. **rankCandidates Function Tests**
   - Multiple matches ranked by score
   - Min score threshold filtering
   - Max results limit enforcement
   - Sort order validation
   - Exact match priority

4. **Edge Cases**
   - Unicode and special characters (`Dvořák` vs `Dvorak`)
   - Very long names
   - Single character searches
   - Numbers in names

### Integration Tests (`import-fuzzy-matching.test.js`)

1. **Token-based matching** - "Bach" matches "Bach, Johann Sebastian"
2. **Exact matches return options** - Even perfect matches allow user confirmation
3. **Abbreviation matching** - "J. S. Bach" matches "Bach, Johann Sebastian"
4. **Partial last name matching** - "Rachmaninov" matches "Rachmaninoff, Sergei"
5. **Multi-word last names** - "Vaughan Williams" matches "Vaughan Williams, Ralph"
6. **User resolution - composer selection** - User can choose between multiple Bach composers
7. **User resolution - create new composer** - Explicit new composer creation despite similar matches
8. **Title fuzzy matching** - "Hallelujah" matches "Hallelujah Chorus"
9. **Title matching with composer context** - Prioritizes pieces by same composer
10. **User resolution - title selection** - User chooses specific piece from similar titles
11. **User resolution - create new piece** - Explicit new piece creation
12. **ase insensitive matching** - "vivaldi" matches "VIVALDI, Antonio"
13. **Special characters** - Handles accented characters gracefully
14. **Name format conversion** - "Antonio Vivaldi" → "Vivaldi, Antonio"
15. **Empty composer handling** - Gracefully handles missing data

## Running Tests

### Unit Tests
```bash
cd choir-app-backend
node tests/fuzzy-matching-utils.test.js
```

Expected output: All 5 test groups passing

### Integration Tests
```bash
cd choir-app-backend
node tests/import-fuzzy-matching.test.js
```

Expected output: All 15 test scenarios passing

## Benefits

1. **Better User Control**: Users can always review and modify matching decisions
2. **Transparency**: Similarity scores help users understand why matches were suggested
3. **Flexibility**: Can create new entities even when similar ones exist
4. **Improved Matching**: Token-based algorithm handles partial names better
5. **Space-Separated Search**: "Johann Bach" finds "Bach, Johann Sebastian"
6. **Fewer False Positives**: User confirms matches rather than automatic assumptions

## Technical Details

### Similarity Score Ranges
- **1.00**: Exact match (case-insensitive)
- **0.95**: Substring match
- **0.90**: All input tokens matched
- **0.70-0.85**: Partial token matches
- **0.60-1.00**: Levenshtein distance based
- **< 0.60**: Filtered out (not shown to user)

### Database Modifications
None - only changes to matching logic and UI

### API Changes
None - resolutions object extended with new fields:
- `createNewComposer` (boolean)
- `createNewPiece` (boolean)

### Backward Compatibility
✅ Fully backward compatible
- Existing imports without resolutions continue to work
- New resolution fields are optional
- Auto-matching still works when user doesn't make selections

## Future Enhancements

1. **Author Matching**: Apply same fuzzy matching to authors
2. **Category Matching**: Fuzzy match categories/genres
3. **Learning System**: Track user selections to improve future matches
4. **Confidence Thresholds**: Different UI for high vs low confidence matches
5. **Batch Operations**: "Apply to all similar" option
6. **Search History**: Remember user's previous matching decisions

## Related Files

### Backend
- `choir-app-backend/src/controllers/import.controller.js`
- `choir-app-backend/src/utils/name.utils.js`
- `choir-app-backend/tests/fuzzy-matching-utils.test.js`
- `choir-app-backend/tests/import-fuzzy-matching.test.js`

### Frontend
- `choir-app-frontend/src/app/features/collections/import-dialog/import-dialog.component.html`
- `choir-app-frontend/src/app/features/collections/import-dialog/import-dialog.component.ts`
- `choir-app-frontend/src/app/features/collections/import-dialog/import-dialog.component.scss`
- `choir-app-frontend/src/app/core/services/import.service.ts`

## Notes

- Similarity scores are displayed to 2 decimal places in the UI
- The minimum score threshold (0.6) can be adjusted if needed
- Maximum results limit (10) prevents overwhelming the user
- Tests use in-memory SQLite database for speed
- Dark mode styling included for score badges
