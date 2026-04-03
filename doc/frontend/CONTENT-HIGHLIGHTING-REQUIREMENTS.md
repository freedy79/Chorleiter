# Inhalte hervorheben - Requirements & UX-Konzept

## Warum dieses Feature?
Du hast aktuell noch kein klares Bild – daher hier ein pragmatischer Vorschlag:

**„Inhalte hervorheben" = wichtige Inhalte sichtbar priorisieren, ohne Informationsflut.**

Beispiele:
- Wichtiger Post (Terminänderung)
- Wichtige Übungsliste (nächster Auftritt)
- Wichtiges Stück im Repertoire

## UX-Konzept (Empfehlung)

### A) Pin-to-Top + Highlight-Badge (MVP)
- Inhalte können „hervorgehoben" werden
- Erscheinen oben in Listen/Feeds
- Sichtbarer Badge: `Wichtig`
- Optional Ablaufdatum (`highlightUntil`)

Warum empfohlen:
- Einfach zu verstehen
- Geringes Implementierungsrisiko
- Hoher Nutzen im Alltag

### B) Zusätzlich optional: "Spotlight" auf Dashboard
- Separate Box „Aktuell wichtig"
- Maximal 3 Elemente

## Product Rules

### In Scope (MVP)
- Highlight für:
  - Posts
  - Übungslisten
  - optional Repertoire-Elemente
- Priorisierte Sortierung in bestehender UI
- Ablaufdatum für automatische Entschärfung

### Out of Scope (MVP)
- Komplexes Ranking/ML
- Nutzerindividuelle personalisierte Priorität

## Core Requirements

### 1. Highlight-Metadaten
**Priority:** High

Jedes highlight-fähige Entity bekommt:
- `isHighlighted` boolean
- `highlightUntil` nullable datetime
- `highlightReason` nullable string (kurzer Grund)
- `highlightedBy` userId nullable

### 2. Berechtigungen
**Priority:** High

- Posts: Choir Admin/Director + optional Post-Owner
- Übungslisten: Owner der Liste
- Repertoire (falls aktiviert): Choir Admin/Director

### 3. Sichtbarkeit in UI
**Priority:** High

- Listenansichten:
  - Highlighted zuerst
  - danach bestehende Sortierung
- Kartenansicht:
  - deutliche visuelle Markierung
- Dashboard:
  - optionales Widget „Wichtige Inhalte"

### 4. Ablaufverhalten
**Priority:** Medium

- Bei `highlightUntil < now` gilt automatisch als nicht hervorgehoben
- Kein manueller Cleanup nötig (logische Auswertung genügt)

### 5. Accessibility
- Highlight nicht nur farblich kommunizieren (Badge/Icon/Text)
- Screenreader-Label: „Wichtiger Inhalt"

## Backend Requirements

### 1. API (MVP)

```
PUT /api/posts/:id/highlight
PUT /api/practice-lists/:id/highlight
PUT /api/repertoire/:id/highlight          (optional)
```

Payload:
```json
{
  "isHighlighted": true,
  "highlightUntil": "2026-03-31T23:59:59Z",
  "highlightReason": "Generalprobe verschoben"
}
```

### 2. Query Behavior
- Standard-Listenendpunkte liefern Highlight-Felder mit aus
- Sortierung unterstützt `highlightFirst=true`

## Frontend Requirements

- Einheitliche `HighlightChip`-Komponente
- Kontextmenü-Aktion: „Hervorheben / Hervorhebung entfernen"
- Optional Quick-Filter: „Nur wichtige Inhalte"

## Acceptance Criteria (MVP)
1. Berechtigte Nutzer:innen können Inhalte hervorheben
2. Hervorgehobene Inhalte stehen sichtbar oben
3. Ablaufdatum deaktiviert Hervorhebung automatisch
4. UI ist auf Mobile/Desktop klar verständlich

## Empfohlene Einführung

1. **Posts zuerst** (höchste Wirkung bei kleinem Aufwand)
2. **Dann Übungslisten** (in Kombination mit persönlichem Üben)
3. **Repertoire optional** (falls Bedarf im Alltag bestätigt)
