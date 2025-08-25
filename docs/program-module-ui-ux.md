# Concert Program Module UI/UX Proposal

This document outlines a suggested user interface for managing concert programs in the Angular frontend.

## Programme Page
- **Filter bar**
  - Choir selection (dropdown)
  - Status filter: *Entwurf*, *Veröffentlicht*, *Archiviert*
  - Title search field
- **List view** (table or cards)
  - Columns: title, choir, status, element count, total duration, last change
  - Actions per row: open, publish, archive, duplicate, export

## Program Editor
- **Header**
  - Inline-editable title
  - Choir (read only after creation)
  - Expandable description
  - Start time (date/time picker)
- **Summary row**
  - Total duration
  - Display of missing durations: `Fehlende Dauern: n`
  - Planned end time `Geplantes Ende: HH:MM`
- **Toolbar**
  - Add element: music piece, free piece, text, pause, insert template
  - Undo/redo
  - Auto-save with manual save button
  - Publish
- **Element list**
  - Reorder via drag & drop (Angular CDK)
  - Card per element with type badge (colors for piece, pause, text, slot)
  - Fields: title/info, duration input (`mm:ss` parser), optional details (instrument, musician, source, note)
  - Element actions: inline edit, duplicate, delete, show details for DB pieces
  - When a start time is set, a calculated timestamp column (e.g. `19:12`) is shown on the left

## Music Piece Search Dialog
- Toggle between repertoire and full database
- Filters: text search, composer, era/category, presence of duration, instrumentation
- List view with "Add" buttons; multiple selection adds items in order

