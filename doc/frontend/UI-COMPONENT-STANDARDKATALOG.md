# UI Component Standardkatalog (Initial)

Stand: 2026-06-17

Ziel: Wiederkehrende UI-Muster vereinheitlichen, als Shared-Komponenten pflegen und in Features wiederverwenden.

## Priorisierte Top-10 Kandidaten

1. **`PageHeader`-Pattern**  
   - Aktueller Baustein: `shared/components/page-header`  
   - Einsatz: Feature-Header, Titel + Actions + optional Subtitle

2. **`EmptyState`-Pattern**  
   - Aktueller Baustein: `shared/components/empty-state`  
   - Einsatz: Leere Listen/Fehlerarme Zustände

3. **`LoadingState`-Pattern (inline + full area)**  
   - Aktuelle Bausteine: `shared/components/loading-indicator`, `shared/components/inline-loading`  
   - Ziel: einheitliche API für `small/normal/overlay`

4. **`SearchBox`-Pattern**  
   - Aktueller Baustein: `shared/components/search-box`  
   - Ziel: Konsolidierung von Platzhalter, Debounce, Clear-Action

5. **`ResponsiveTable`-Pattern**  
   - Aktueller Baustein: `shared/components/responsive-table`  
   - Einsatz: tabellarische Feature-Listen (Admin + Fachmodule)

6. **`ConfirmDialog`-Pattern**  
   - Aktueller Baustein: `shared/components/confirm-dialog`  
   - Ziel: einheitliche Copy, Button-Reihenfolge, Danger-Variant

7. **`ErrorDisplay`-Pattern**  
   - Aktueller Baustein: `shared/components/error-display`  
   - Ziel: konsistenter Fehlerzustand inkl. Retry-Action

8. **`FAB / QuickAction`-Pattern**  
   - Aktueller Baustein: `shared/components/fab`  
   - Ziel: mobile Quick-Actions standardisieren

9. **`MenuListItem`-Pattern**  
   - Aktueller Baustein: `shared/components/menu-list-item`  
   - Einsatz: Navigations-/Kontextmenüs

10. **`Role/Demo-Gated Action`-Pattern**  
   - Wiederkehrendes Muster in Features (Buttons sichtbar/disabled je Rolle oder Demo-Modus)  
   - Ziel: zentraler Directive-/Helper-Ansatz statt verteilter if/disabled-Logik

---

## Erste 2 Migrationskandidaten (Startpaket)

### Kandidat A: Loading + Empty State Vereinheitlichung

- Scope: Listen-/Dashboard-/Admin-Seiten
- Ziel: Jede Datenansicht nutzt konsistent `loading`, `empty`, `error`
- Nutzen: weniger Template-Duplikat, besser testbar

#### API-Vertrag (V1)

**Komponente:** `app-data-state`

- Inputs
   - `isLoading: boolean`
   - `hasError: boolean`
   - `errorTitle?: string`
   - `errorMessage?: string`
   - `isEmpty: boolean`
   - `emptyTitle?: string`
   - `emptyMessage?: string`
   - `compact?: boolean`
- Outputs
   - `retry = EventEmitter<void>()`
- Content-Projektion
   - `<ng-content></ng-content>` für den Erfolgszustand (Daten vorhanden)
- A11y
   - Loading: `aria-busy=true`
   - Error/Empty: semantische Überschriften + Fokus auf Retry bei Tastaturbedienung

**Nutzungsregel:**
- Nur diese Komponente steuert die Zustandsreihenfolge `loading > error > empty > content`.

### Kandidat B: Confirm Dialog Standardisierung

- Scope: Lösch-, Ablehn-, Abmelde-, Sicherheitsaktionen
- Ziel: zentrale Variante mit standardisierter Semantik und A11y
- Nutzen: konsistente UX bei kritischen Aktionen

#### API-Vertrag (V1)

**Dialog-Daten:**

```ts
interface ConfirmDialogModel {
   title: string;
   message: string;
   confirmButtonText?: string;    // default: "Bestätigen"
   cancelButtonText?: string;     // default: "Abbrechen"
   variant?: 'default' | 'danger';
   requireTypedConfirmation?: boolean;
   confirmationText?: string;      // z. B. "LÖSCHEN"
}
```

**Rückgabewert:**
- `boolean` (`true` = bestätigt)

**A11y + UX-Regeln:**
- Primäraktion rechts, Esc schließt mit `false`
- `variant='danger'` für irreversible Aktionen
- Fokussteuerung auf sichere Standardaktion (`Abbrechen`)

---

## Nächste Umsetzungsschritte

- [ ] Fundstellen je Kandidat mit Ziel-Dateien erfassen
- [x] API-Verträge (Inputs/Outputs) für Kandidat A/B fixieren
- [ ] Migrationsreihenfolge (Quick Wins zuerst) definieren
- [ ] Erstes Mini-Refactoring in einem Feature-Modul durchführen

---

## Ergänzung (2026-07): Availability-Status-Trigger Pattern

### Ziel

- Einheitliche, platzsparende und mobile-taugliche Rückmeldung für Terminstatus (`Zusage`, `Vielleicht`, `Absage`) in Kalender-/Dashboard-Kontexten.

### Pattern-Beschreibung

- **Kompakter Status-Trigger** (ein farbiges Icon) statt drei permanent sichtbarer Buttons.
- Klick/Tap auf den Trigger öffnet ein **Dropdown-Menü** (`mat-menu`) mit allen Statusoptionen.
- Nach Statusänderung erfolgt unmittelbares Feedback über **Snackbar**.

### Konsistenzregeln

- Farben und Icons sind semantisch eindeutig:
   - `AVAILABLE` → Grün + `check_circle`
   - `MAYBE` → Gelb + `help`
   - `UNAVAILABLE` → Rot + `cancel`
   - `unset` → Neutralgrau + `event_available`
- Tooltip-Textformat: `Status: <Wert> · ändern`
- Menü zeigt den aktuellen Wert mit `done`-Marker.

### Desktop/Mobile-Regeln

- **Desktop:** sichtbarer Trigger kompakt (ca. 2rem), Fokus-Hervorhebung sichtbar.
- **Mobile:** sichtbarer Trigger bleibt kompakt, aber **Touch-Hit-Area min. 44px** (`$touch-target-min`).
- Labels/Copy bleiben knapp; Statuszusammenfassung zusätzlich als Text möglich.

### A11y-Regeln

- Trigger benötigt aussagekräftiges `aria-label` inkl. aktuellem Status.
- Statusanzeige nutzt `aria-live="polite"` für Änderungen.
- Interaktive Elemente bleiben vollständig per Tastatur erreichbar.

### Aktuelle Referenzstellen

- `src/app/features/home/dashboard/widgets/upcoming-events-widget.*`
- `src/app/features/my-calendar/my-calendar.component.*`
- `src/app/features/home/event-card/event-card.component.*`
