# Frontend Security Route Guard Matrix

Stand: 2026-06-17

## Zweck

Dokumentiert, welche Route durch welche Guards geschützt ist und welche Negativtests erforderlich sind.

## Matrix (Initial)

| Bereich | Beispielrouten | Guards | Erwartung ohne Auth/Berechtigung |
|---|---|---|---|
| Öffentlich | `/`, `/login`, `/imprint`, `/privacy`, `/forms/public/:guid` | keiner / LoginGuard bei `/login` | Zugriff erlaubt |
| Allgemein geschützt | `/dashboard`, `/events`, `/chat`, `/library`, `/repertoire` | `AuthGuard` | Redirect/Block |
| Chor-Admin geschützt | `/forms/new`, `/forms/:id/edit`, `/public-page`, `/collections/new` | `AuthGuard + ChoirAdminGuard` | 403/Redirect |
| Programmplanung | `/programs`, `/programs/create`, `/programs/:id` | `AuthGuard + ProgramGuard` | 403/Redirect |
| Admin | `/admin/**` | `AuthGuard + AdminGuard` | 403/Redirect |
| Training (Admin-Testbereich) | `/training/**` | `AuthGuard + AdminGuard` | 403/Redirect |

## Guard-Mapping-Quellen

- `src/app/app-routing.module.ts`
- `src/app/features/admin/admin.routes.ts`
- `src/app/features/training/training.routes.ts`

## ToDo

- [ ] Für jede geschützte Route einen Deep-Link-Negativtest ausführen
- [ ] Redirect-Ziel und HTTP-Fehlerbild dokumentieren
- [ ] Demo-User-Sonderregeln mitprüfen
