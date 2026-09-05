# Frontend Security Negativtests

Stand: 2026-06-17

## Testfälle (Initialkatalog)

- [ ] Unangemeldet: Direktaufruf `/dashboard` → kein Zugriff
- [ ] Unangemeldet: Direktaufruf `/admin/dashboard` → kein Zugriff
- [ ] Normalnutzer: Direktaufruf `/forms/new` → kein Zugriff
- [ ] Normalnutzer: Direktaufruf `/public-page` → kein Zugriff
- [ ] Ohne Program-Rolle: Direktaufruf `/programs` → kein Zugriff
- [ ] Ohne Adminrolle: Direktaufruf `/training/dashboard` → kein Zugriff
- [ ] Session abgelaufen: geschützte Route neu laden → kein Zugriff
- [ ] URL-Manipulation mit fremder ID (z. B. `/collections/edit/:id`) → kein Zugriff auf fremde Daten

## Erwartungskriterien

- [ ] Keine sensitiven Daten im UI vor Redirect sichtbar
- [ ] Kein Zugriff nur wegen bekannter URL möglich
- [ ] Konsistentes Verhalten in Desktop/Mobile
