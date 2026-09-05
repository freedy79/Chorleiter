# Code Cleanup Report (Phase 2 – Initial)

Stand: 2026-06-17

## Quelle

- `npm run prune --prefix choir-app-frontend` (`ts-prune -p tsconfig.app.json`)

## Ergebnisübersicht

- Es wurden zahlreiche potenziell ungenutzte Exporte gemeldet.
- Ein erheblicher Teil ist als `used in module` markiert und muss als **False Positive / Re-Export / Runtime-Nutzung** geprüft werden.

## Priorisierte Kandidaten (manuelle Prüfung zuerst)

### P1 – Hohe Wahrscheinlichkeit ungenutzt (ohne `used in module`-Marker)

- `src/app/features/home/home.component.ts` → `HomeComponent`
- `src/app/layout/choir-switcher/choir-switcher.component.ts` → `ChoirSwitcherComponent`
- `src/app/features/admin/general/general-settings.component.ts` → `GeneralSettingsComponent`
- `src/app/features/user/registration/register.component.ts` → `RegisterComponent`
- `src/app/core/operators/api-operators.ts` → `withLoadingState`, `withNotification`, `withApiHandling`
- `src/app/shared/util/*` verschiedene Utilities (`array`, `object`, `storage`, `string`, `type-guards`)

### P2 – Mögliche Re-Export/Typ-Nutzung (mit Vorsicht)

- `src/app/shared/block-editor/index.ts` diverse Export-Typen und Factorys
- `src/app/shared/constants/*` Rollen-/Zeit-Konstanten
- verschiedene Model-/Dialog-Interfaces mit „used in module“

## Empfohlene Vorgehensweise

1. **P1-Kandidaten** mit Referenzsuche verifizieren (Definition/Import/Runtime).
2. Für jede bestätigte Leiche: entfernen + `lint/test/build` laufen lassen.
3. P2 nur nach P1 und mit kleinem Batch (max. 5 Exporte pro Commit) anfassen.

## Konkrete ToDo-Liste

- [ ] P1-Kandidaten per Referenzprüfung klassifizieren (`keep/remove`)
- [ ] Erste Dead-Code-Bereinigung (Batch 1)
- [ ] Re-Run `ts-prune`, Delta dokumentieren
- [ ] Batch 2 und Batch 3 bis signifikante Reduktion erreicht

## Erfolgskriterium

- Reduzierte `ts-prune`-Trefferzahl
- Keine Regression in `lint`, `test`, `build`
