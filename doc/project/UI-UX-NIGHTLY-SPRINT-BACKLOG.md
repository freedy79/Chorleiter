# UI/UX Nightly Sprint Backlog (Autopilot)

**Datum:** 2026-06-09  
**Scope:** choir-app-frontend  
**Qualitätsregel:** Jeder Implementierungsschritt enthält passende Tests; Commit nur bei grünem Teststatus.

## Leitplanken

- Keine Shortcuts, keine lokalen Einmal-Fixes.
- Nur architektonisch saubere, wiederverwendbare Lösungen.
- Vor Beginn **jeder Welle**: Sicherheits-Commit (Checkpoint).
- Pro Implementierungsschritt:
  1. Änderung umsetzen
  2. Relevante Tests ergänzen/aktualisieren
  3. Tests ausführen (mind. targeted + sinnvolle Regression)
  4. Erst dann Commit

## Welle 0 – Baseline & Governance

### Ziel
Arbeitsgrundlage, Agentenstruktur und Backlog verankern.

### Schritte
1. Backlog dokumentieren (`doc/project/UI-UX-NIGHTLY-SPRINT-BACKLOG.md`)
2. Agent-Template und Spezial-Agenten ablegen (`.github/agents/`)
3. Checkpoint-Commit erstellen

### Test-Policy
- Kein Codepfad geändert, daher kein Laufzeit-Test zwingend.
- Repository bleibt build-fähig; nächste Welle startet mit Tests.

---

## Welle 1 – Quick Wins (hohe Wirkung, niedriger Aufwand)

### Ziel
Schnell spürbare UX/A11y-Verbesserung ohne Risiko.

### Schritt A: Error-Recovery standardisieren
- **Änderung:** `ErrorDisplayComponent` um Retry-Action erweitern (optional callback/event), ohne bestehende API zu brechen.
- **Dateien:**
  - `src/app/shared/components/error-display/error-display.component.ts`
  - `src/app/shared/components/error-display/error-display.component.html`
  - `src/app/shared/components/error-display/error-display.component.spec.ts`
- **Tests:**
  - Komponente rendert Retry-Button nur bei retry-fähigem Fehlerzustand.
  - Klick auf Retry löst den vorgesehenen Mechanismus aus.

### Schritt B: Header-A11y konsolidieren
- **Änderung:** Alle icon-only Buttons im `MainLayout` mit konsistenten `aria-label`s versehen.
- **Dateien:**
  - `src/app/layout/main-layout/main-layout.component.html`
  - `src/app/layout/main-layout/main-layout.component.spec.ts`
- **Tests:**
  - DOM-Assertions auf vorhandene `aria-label` Attribute für relevante Buttons.

### Schritt C: Routing-Inkonsistenz entfernen
- **Änderung:** Doppelten Route-Eintrag `collections/view/:id` bereinigen.
- **Dateien:**
  - `src/app/app-routing.module.ts`
  - (optional) neue Spec für Route-Integrität
- **Tests:**
  - Route-Config enthält Pfad nur einmal.

### Commit-Plan Welle 1
1. Checkpoint-Commit (vor Start Welle)
2. Commit Schritt A (grüne Tests)
3. Commit Schritt B (grüne Tests)
4. Commit Schritt C (grüne Tests)

---

## Welle 2 – Konsistenz & Responsiveness

### Ziel
Design-System-Treue und mobile Robustheit erhöhen.

### Schritt D: Inline-Styles in Admin-Spendenseite entfernen
- Extraktion in SCSS-Klassen + Theme-Token.
- Tests: Snapshot/DOM-Klassenprüfungen.

### Schritt E: Dialog-Öffnung vereinheitlichen
- Nutzung von `DialogHelperService` in priorisierten Call Sites (`dashboard`, `main-layout`).
- Tests: mobile/fullscreen Verhalten per Service-Spec.

### Schritt F: Empty-State-Muster ausrollen (Pilot)
- Pilot auf 2 Kernseiten (z. B. Library + eine weitere Liste).
- Tests: Empty-State sichtbar mit klarer Handlungsaufforderung.

### Commit-Plan Welle 2
- Checkpoint vor Welle
- Separate Commits je Schritt D/E/F mit grünem Teststatus

---

## Welle 3 – IA & Workflow-Qualität

### Ziel
Orientierung, Navigierbarkeit und Informationsarchitektur verbessern.

### Schritt G: `PageHeader` mit Kontext-/Breadcrumb-Slot erweitern
- API rückwärtskompatibel, optionales Breadcrumb-Model.
- Tests: Rendert Titel + Breadcrumb korrekt.

### Schritt H: Menüverdichtung vorbereiten (strukturierte Konfiguration)
- Navigationsstruktur entkoppeln/normalisieren, ohne sichtbaren Bruch.
- Tests: Sichtbarkeitslogik unverändert grün.

### Schritt I: Form- und Statusmuster dokumentieren + Enforcer-Tests
- Wiederverwendbare Guidelines in Code + minimale Prüfungen.

### Commit-Plan Welle 3
- Checkpoint vor Welle
- Separate Commits G/H/I mit grünem Teststatus

---

## Definition of Done

- Änderungen sind token-/komponentenbasiert statt hardcoded.
- A11y: icon-only Controls mit `aria-label`, Tastaturpfade intakt.
- Für jeden Schritt existieren passende Tests und grüne Ausführung.
- Commit-Historie bildet Wellen- und Schrittstruktur nachvollziehbar ab.
