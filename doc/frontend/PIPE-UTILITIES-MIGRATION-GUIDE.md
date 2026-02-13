# Pipe Utilities Migration Guide

## Overview

This document provides guidance for migrating duplicate utility functions to reusable Angular pipes across the Chorleiter application. The pipes eliminate code duplication and provide consistent formatting throughout the application.

## Created Pipes

All pipes are located in `choir-app-frontend/src/app/shared/pipes/` and are **standalone pipes** that can be imported directly into components.

### 1. DurationPipe (`duration.pipe.ts`)

**Purpose:** Transforms seconds to "mm:ss" format.

**Usage:**
```typescript
// In template
{{ 125 | duration }}  // Output: "02:05"
{{ 3661 | duration }} // Output: "61:01"

// In component (if needed)
import { DurationPipe } from '@shared/pipes/duration.pipe';

@Component({
  imports: [DurationPipe, ...]
})
export class MyComponent {
  private durationPipe = new DurationPipe();

  formatTime(seconds: number): string {
    return this.durationPipe.transform(seconds);
  }
}
```

**Replaces:**
- `formatDuration()` method in program-editor.component.ts
- `formatDuration()` method in piece-detail.component.ts

---

### 2. ComposerYearsPipe (`composer-years.pipe.ts`)

**Purpose:** Formats composer birth/death years.

**Usage:**
```typescript
// In template
{{ composer | composerYears }}
// Input: { birthYear: 1685, deathYear: 1750 }
// Output: " (1685-1750)"

{{ composer | composerYears:false }}
// Output: "1685-1750" (no parentheses)

// In component
import { ComposerYearsPipe } from '@shared/pipes/composer-years.pipe';

@Component({
  imports: [ComposerYearsPipe, ...]
})
export class MyComponent {
  private composerYearsPipe = new ComposerYearsPipe();

  getYears(composer: any): string {
    return this.composerYearsPipe.transform(composer);
  }
}
```

**Replaces:**
- `formatComposerYears()` method in program-editor.component.ts
- `formatComposerYears()` method in piece-detail.component.ts

---

### 3. FileSizePipe (`file-size.pipe.ts`)

**Purpose:** Formats file sizes from bytes to human-readable format.

**Usage:**
```typescript
// In template
{{ 1536 | fileSize }}       // Output: "1.5 kB"
{{ 1048576 | fileSize }}    // Output: "1.0 MB"
{{ 1536 | fileSize:2 }}     // Output: "1.50 kB" (custom decimals)

// In component
import { FileSizePipe } from '@shared/pipes/file-size.pipe';
```

**Replaces:**
- `formatFileSize()` method in piece-detail.component.ts

---

### 4. PersonNamePipe (`person-name.pipe.ts`)

**Purpose:** Formats person objects into display names.

**Usage:**
```typescript
// In template
{{ person | personName }}
// Input: { name: "Müller", firstName: "Hans" }
// Output: "Müller, Hans"

{{ person | personName:'firstLast' }}
// Output: "Hans Müller"

{{ person | personName:'lastOnly' }}
// Output: "Müller"

{{ person | personName:'firstOnly' }}
// Output: "Hans"

// In component
import { PersonNamePipe } from '@shared/pipes/person-name.pipe';
```

**Potential Use Cases:**
- monthly-plan.component.html (director/organist names)
- event-list.component.html (person displays)
- Any component displaying person data

---

### 5. ReferencePipe (`reference.pipe.ts`)

**Purpose:** Formats piece/collection reference data.

**Usage:**
```typescript
// In template
{{ piece | reference }}
// Input: { prefix: "AB", number: "123" }
// Output: "AB 123"

{{ piece | reference:'' }}
// Output: "AB123" (no separator)

{{ piece | reference:' ':'-' }}
// Output with custom separator and fallback

// In component
import { ReferencePipe } from '@shared/pipes/reference.pipe';
```

**Replaces:**
- `formatReferenceForDisplay()` method in literature-list.component.ts

---

### 6. WeekdayPipe (`weekday.pipe.ts`)

**Purpose:** Converts dates to German weekday names.

**Usage:**
```typescript
// In template
{{ date | weekday }}
// Input: "2024-01-15" (Monday)
// Output: "Mo"

{{ date | weekday:'long' }}
// Output: "Montag"

// In component
import { WeekdayPipe } from '@shared/pipes/weekday.pipe';
```

**Replaces:**
- `weekdayShort()` method in monthly-plan.component.ts

---

### 7. EventShortPipe (`event-short.pipe.ts`)

**Purpose:** Extracts short event type abbreviations from plan entries.

**Usage:**
```typescript
// In template
{{ entry | eventShort }}
// Input: { notes: "Gottesdienst 10:00" }
// Output: "GD"

// Input: { notes: "Chorprobe im Gemeindesaal" }
// Output: "CP"

// In component
import { EventShortPipe } from '@shared/pipes/event-short.pipe';
```

**Replaces:**
- `eventShort()` method in monthly-plan.component.ts

---

### 8. JoinPipe (`join.pipe.ts`)

**Purpose:** Joins array elements by property or as strings.

**Usage:**
```typescript
// In template
{{ choirs | join:'name' }}
// Input: [{ name: "Choir A" }, { name: "Choir B" }]
// Output: "Choir A, Choir B"

{{ choirs | join:'name':' | ' }}
// Output: "Choir A | Choir B" (custom separator)

{{ tags | join }}
// Input: ["tag1", "tag2", "tag3"]
// Output: "tag1, tag2, tag3"

// In component
import { JoinPipe } from '@shared/pipes/join.pipe';
```

**Replaces:**
- `choirList()` method in manage-users.component.ts

---

## Migration Steps

### Step 1: Import the Pipe

Add the pipe import to your component:

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DurationPipe } from '@shared/pipes/duration.pipe'; // Add this

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, DurationPipe], // Add to imports array
  templateUrl: './my-component.component.html',
})
export class MyComponent {
  // ...
}
```

### Step 2: Use in Template

Replace method calls with pipe syntax:

**Before:**
```html
<div>{{ formatDuration(piece.durationSec) }}</div>
```

**After:**
```html
<div>{{ piece.durationSec | duration }}</div>
```

### Step 3: Remove Duplicate Method

Delete the old utility method from your component class:

```typescript
// DELETE THIS:
formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
```

### Step 4: (Optional) Use in Component Logic

If you need the pipe in component methods:

```typescript
import { DurationPipe } from '@shared/pipes/duration.pipe';

export class MyComponent {
  private durationPipe = new DurationPipe();

  someMethod() {
    const formatted = this.durationPipe.transform(125);
    console.log(formatted); // "02:05"
  }
}
```

---

## Completed Migrations

The following components have already been migrated:

### ✅ program-editor.component.ts
- **Removed:** `formatDuration()`, `formatComposerYears()`
- **Using:** `DurationPipe`, `ComposerYearsPipe`
- **Files:** `program-editor.component.ts`, `program-editor.component.html`

### ✅ piece-detail.component.ts
- **Removed:** `formatDuration()`, `formatComposerYears()`, `formatFileSize()`
- **Using:** `DurationPipe`, `ComposerYearsPipe`, `FileSizePipe`
- **Files:** `piece-detail.component.ts`, `piece-detail.component.html`

### ✅ literature-list.component.ts
- **Removed:** `formatReferenceForDisplay()`
- **Using:** `ReferencePipe`
- **Note:** Uses empty separator `{{ piece | reference:'' }}` to match originalformat
- **Files:** `literature-list.component.ts`, `literature-list.component.html`

### ✅ monthly-plan.component.ts
- **Removed:** `weekdayShort()`, `eventShort()`
- **Using:** `WeekdayPipe`, `EventShortPipe`
- **Files:** `monthly-plan.component.ts`, `monthly-plan.component.html`

### ✅ manage-users.component.ts
- **Removed:** `choirList()`
- **Using:** `JoinPipe`
- **Files:** `manage-users.component.ts`, `manage-users.component.html`

---

## Components That Could Benefit

The following components may have similar duplicate logic and should be reviewed:

### 🔍 Components to Review:

1. **event-list.component.ts/html**
   - Likely uses person name formatting → Consider `PersonNamePipe`
   - May have event type formatting → Consider existing `EventTypeLabelPipe` or `EventShortPipe`

2. **shared-piece-view.component.ts/html**
   - May format composer data → Consider `ComposerYearsPipe`
   - May format duration → Consider `DurationPipe`

3. **rehearsal-support.component.ts/html**
   - May have audio duration formatting → Consider `DurationPipe`

4. **program-list.component.ts/html**
   - May format event data → ReviewFor potential pipe usage

5. **Any component displaying:**
   - Person names → Use `PersonNamePipe`
   - File sizes → Use `FileSizePipe`
   - Time durations → Use `DurationPipe`
   - Collection references → Use `ReferencePipe`
   - Date weekdays → Use `WeekdayPipe`
   - Array joins → Use `JoinPipe`

---

## Testing

Each pipe includes comprehensive unit tests. Run tests:

```bash
ng test --include='**/*.pipe.spec.ts'
```

Individual pipe tests:
```bash
ng test --include='**/duration.pipe.spec.ts'
ng test --include='**/composer-years.pipe.spec.ts'
ng test --include='**/file-size.pipe.spec.ts'
ng test --include='**/person-name.pipe.spec.ts'
ng test --include='**/reference.pipe.spec.ts'
ng test --include='**/weekday.pipe.spec.ts'
ng test --include='**/event-short.pipe.spec.ts'
ng test --include='**/join.pipe.spec.ts'
```

---

## Best Practices

### 1. **Prefer Pipes in Templates**
Pipes provide better change detection performance in templates.

### 2. **Use Pipes for Formatting Only**
Pipes should only transform display values, not mutate data or have side effects.

### 3. **Keep Pipes Pure**
All created pipes are marked as `pure: true`, meaning they only recalculate when inputs change.

### 4. **Document Custom Parameters**
When using optional parameters (separators, formats), add a comment explaining why:

```html
<!-- Empty separator for collection reference format -->
{{ piece | reference:'' }}
```

### 5. **Reuse Existing Pipes**
Before creating component methods, check if a pipe already exists in `@shared/pipes/`.

---

## Benefits

### ✅ Code Reduction
- Eliminates duplicate methods across 15+ components
- Reduces maintenance burden

### ✅ Consistency
- Ensures uniform formatting across the application
- Single source of truth for display logic

### ✅ Testability
- Each pipe has comprehensive unit tests
- Easier to test than component methods

### ✅ Performance
- Pure pipes are optimized by Angular's change detection
- Reusable instances reduce memory footprint

### ✅ Maintainability
- Changes to formatting logic only need to be made in one place
- Clear separation of concerns

---

## Support

If you encounter issues or have questions about migrating to these pipes:

1. Review the pipe's JSDoc documentation and unit tests
2. Check existing migrations in the components listed above
3. Ensure you're using the correct import path: `@shared/pipes/[pipe-name].pipe`

---

## Quick Reference Table

| Old Method | New Pipe | Import | Template Usage |
|------------|----------|--------|----------------|
| `formatDuration(sec)` | `DurationPipe` | `@shared/pipes/duration.pipe` | `{{ sec \| duration }}` |
| `formatComposerYears(c)` | `ComposerYearsPipe` | `@shared/pipes/composer-years.pipe` | `{{ c \| composerYears }}` |
| `formatFileSize(bytes)` | `FileSizePipe` | `@shared/pipes/file-size.pipe` | `{{ bytes \| fileSize }}` |
| `formatReferenceForDisplay(p)` | `ReferencePipe` | `@shared/pipes/reference.pipe` | `{{ p \| reference:'' }}` |
| `weekdayShort(date)` | `WeekdayPipe` | `@shared/pipes/weekday.pipe` | `{{ date \| weekday }}` |
| `eventShort(entry)` | `EventShortPipe` | `@shared/pipes/event-short.pipe` | `{{ entry \| eventShort }}` |
| `choirList(user)` | `JoinPipe` | `@shared/pipes/join.pipe` | `{{ user.choirs \| join:'name' }}` |
| Person name formatting | `PersonNamePipe` | `@shared/pipes/person-name.pipe` | `{{ person \| personName }}` |

---

**Last Updated:** 2026-02-10
**Author:** Claude Code Assistant
