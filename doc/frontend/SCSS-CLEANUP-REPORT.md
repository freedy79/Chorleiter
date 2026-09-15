# SCSS Cleanup Report (Phase 2 – Initial)

Stand: 2026-06-17

## Quellen

- Build-/Test-Läufe (`ng build`, `ng test`) mit Sass-Warnungen

## Befunde

### 1) Sass-Deprecation: `mixed-decls`

Wiederkehrende Warnung: Deklarationen nach verschachtelten Regeln.

Häufig betroffene Dateien (priorisiert):

- `src/app/features/chat/chat.component.scss`
- `src/app/features/monthly-plan/monthly-plan.component.scss`
- `src/app/features/literature/literature-list/literature-list.component.scss`
- `src/app/features/choir-members/choir-members.component.scss`
- `src/app/features/events/event-list/event-list.component.scss`
- `src/themes/_breakpoints.scss`
- zusätzlich Admin-Bereiche, z. B. `usage-statistics`, `pwa-vapid-keys`

### 2) Budget-Warnungen

- Initial-Bundle-Budget minimal überschritten (`+2.90 kB`)
- Komponenten-SCSS-Budgets überschritten:
  - `chat.component.scss`
  - `monthly-plan.component.scss`
  - `exercise-player.component.scss`

## Empfohlene Maßnahmen

1. `mixed-decls`-Fixes pro Datei:
   - Deklarationen über verschachtelte Regeln ziehen **oder** in `& { ... }` kapseln.
2. SCSS entkoppeln:
   - große Komponenten in Teilblöcke splitten (BEM/Section-Splitting)
   - wiederkehrende Styles in Theme-Utilities verschieben.
3. Budget-schonende Refactorings:
   - redundante Regeln entfernen
   - komplexe Selektorketten vereinfachen
   - utilities statt feature-lokaler Dopplungen nutzen.

## Konkrete ToDo-Liste

- [ ] `mixed-decls` in `chat.component.scss` bereinigen
- [ ] `mixed-decls` in `monthly-plan.component.scss` bereinigen
- [ ] `mixed-decls` in `_breakpoints.scss` bereinigen
- [ ] Budget-Delta nach jedem Fix-Batch messen (`ng build`)
- [ ] Warnungsdelta im Report fortschreiben

## Erfolgskriterium

- Deutliche Reduktion der Sass-Deprecation-Warnungen
- Budget-Warnungen reduziert oder vollständig beseitigt
