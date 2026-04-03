# Personal Practice Lists + Offline Pinning - Requirements

## Overview
Dieses Dokument definiert die Anforderungen für **persönliche Übungslisten** mit gezielter Offline-Verfügbarkeit.

Kernidee: Nur Inhalte, die Nutzer:innen explizit in persönliche Übungslisten aufnehmen und dort „offline pinnen“, werden lokal vorgehalten.

## Product Decision (Fix)
- **Kein Entitlement-/Abo-System**
- **Kein Feature-Gating über Free/Standard/Premium**
- Projekt bleibt spendenbasiert

## Business Objectives
1. Persönliches, fokussiertes Üben je Mitglied ermöglichen
2. Offline-Nutzung für „wirklich relevante“ Medien ermöglichen
3. Speicherverbrauch kontrollieren (nur gepinnte Inhalte)
4. Rehearsal-Flow auf Mobile und Desktop verbessern

## Non-Goals
- Vollständige Offline-Spiegelung aller Chorinhalte
- DRM/komplexe Lizenzprüfung im Client
- Tarifabhängige Limits

## Core Requirements

### 1. Persönliche Übungslisten
**Priority:** High

Nutzer:innen können mehrere Übungslisten erstellen, z. B.:
- „Sonntag 14.03.“
- „Alt Vorbereitung Ostern“
- „Schwierige Stellen Q2"

#### 1.1 List Operations
- Liste erstellen/umbenennen/löschen
- Reihenfolge der Listen ändern (Drag & Drop optional)
- Liste optional mit Datum/Ziel versehen

#### 1.2 List Items
Einträge können sein:
- Stück (`pieceId`)
- Medienlink am Stück (`piece_link.id`, optional)
- Optional später: Abschnitt/Marker

Pro Item:
- `orderIndex`
- optionale persönliche Notiz
- `isPinnedOffline` (entscheidend für Offline)

### 2. Offline Pinning (gezielt)
**Priority:** High

#### 2.1 Regeln
- Nur `isPinnedOffline = true` wird lokal gespeichert
- Bei Unpin: lokaler Inhalt wird bereinigt (ggf. verzögert)
- Bei Löschung einer Liste: zugehörige Pins prüfen und ggf. entfernen
- Wenn Medium in mehreren Listen gepinnt ist: erst entfernen, wenn keine Referenz mehr existiert

#### 2.2 Unterstützte Offline-Typen (MVP)
- Audio-Dateien aus `piece-files` (mp3/mpeg)
- Notenbilder (Bild/PDF), sofern als Datei-Link erreichbar
- Metadaten für Anzeige (Titel, Komponist, Dauer, Referenz)

#### 2.3 Speicher-Management
- Globales lokales Speicherziel (z. B. 500 MB) als konfigurierbarer Wert
- UI zeigt:
  - aktuell genutzten Speicher
  - Größe pro gepinntem Medium
  - Warnung bei knappem Speicher
- Verhalten bei Platzmangel:
  - Benutzerhinweis mit Auswahl „andere Pins entfernen“
  - kein stilles Löschen durch die App

### 3. Synchronisation & Konsistenz
**Priority:** High

- Server bleibt Source of Truth für Listen/Pin-Status
- Offline-Downloads sind Cache-Artefakte im Client
- Bei Login auf neuem Gerät:
  - Listen synchron vorhanden
  - Medien müssen lokal neu geladen werden

Konfliktbehandlung:
- Last-write-wins für Listen-Metadaten
- Item-Reorder konfliktarm durch serverseitige Normalisierung von `orderIndex`

### 4. UI/UX Requirements
**Priority:** High

#### 4.1 New Screens
- `Meine Übungslisten` (Liste aller Listen)
- `Übungsliste Detail` (Items + Pin-Status + Fortschritt)

#### 4.2 In bestehender Stückansicht
- Aktion „Zu Übungsliste hinzufügen"
- Aktion „Offline pinnen" (direkt am Medium)
- Download-/Pin-Status-Chips:
  - Nicht gepinnt
  - Download läuft
  - Offline verfügbar
  - Fehler

#### 4.3 Offline UX
- Offline-Badge klar sichtbar
- Bei offline nicht verfügbarem Medium: eindeutiger Hinweis + CTA „online öffnen“
- Keine leeren Fehlerzustände

### 5. Backend Requirements
**Priority:** High

#### 5.1 Datenmodell (Vorschlag)

`practice_list`
- `id`
- `userId` (FK)
- `choirId` (FK, Kontext)
- `title`
- `description` nullable
- `targetDate` nullable
- timestamps

`practice_list_item`
- `id`
- `practiceListId` (FK)
- `pieceId` (FK)
- `pieceLinkId` nullable (FK)
- `orderIndex`
- `note` nullable
- `isPinnedOffline` boolean default false
- timestamps

#### 5.2 API Endpoints (MVP)

```
GET    /api/practice-lists
POST   /api/practice-lists
PUT    /api/practice-lists/:id
DELETE /api/practice-lists/:id

GET    /api/practice-lists/:id/items
POST   /api/practice-lists/:id/items
PUT    /api/practice-lists/:id/items/:itemId
DELETE /api/practice-lists/:id/items/:itemId
PUT    /api/practice-lists/:id/items/reorder

POST   /api/practice-lists/:id/items/:itemId/pin
DELETE /api/practice-lists/:id/items/:itemId/pin
```

### 6. Frontend Requirements
**Priority:** High

- Neuer Domain-Service: `PracticeListService`
- Offline-Cache über bestehende IndexedDB-Struktur erweitern
- Pin-Download-Queue (parallel begrenzt, z. B. 2-3 Downloads)
- Robuste Retry-Strategie bei Netzabbrüchen

### 7. Security & Privacy
- Zugriff nur auf eigene Listen (`userId`)
- Kein chorübergreifender Zugriff auf private Listen
- Notizen sind privat (nur Owner)

### 8. Telemetry (optional, anonymisiert)
- Anzahl Listen pro User
- Anzahl Pins pro User
- Erfolgs-/Fehlerrate beim Download

### 9. Acceptance Criteria (MVP)
1. User kann eine Übungsliste erstellen und mindestens 10 Stücke hinzufügen
2. User kann ein Medium pinnen und offline öffnen
3. Offline nicht gepinnte Medien sind klar als nicht verfügbar markiert
4. Pin-Status bleibt nach App-Neustart erhalten
5. Entpinnen entfernt lokale Datei (wenn keine weitere Referenz vorhanden)

### 10. Phasing

#### Phase 1 (MVP)
- Listen CRUD
- Items CRUD
- Pin/Unpin + Offline-Playback/Anzeige für gepinnte Medien

#### Phase 2
- Reorder + Batch Pin/Unpin
- Speicherübersicht + Cleanup UI

#### Phase 3
- Feingranulare Übeabschnitte/Marker
- Optional: persönlicher Fortschritt je Item
