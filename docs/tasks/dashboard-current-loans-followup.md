# Dashboard: aktuelle Entleihungen sichtbar machen

## Problem
Das neue Dashboard-Widget für aktuelle Entleihungen wird in der Startseite nicht angezeigt, obwohl der Code bereits in Frontend und Backend vorhanden ist.

## Kontext
- Widget-Komponente: `choir-app-frontend/src/app/features/home/dashboard/widgets/current-loans-widget.component.*`
- Einbindung im Dashboard-Template: `choir-app-frontend/src/app/features/home/dashboard/dashboard.component.html` (`app-current-loans-widget` in der rechten Spalte, nur wenn `currentLoans.length > 0`).
- Datenquelle: `ApiService.getCurrentLibraryLoans()` → `LibraryService.getCurrentLoans()` → Backend-Route `GET /library/loans/current` (`choir-app-backend/src/routes/library.routes.js`).

## Offene Fragen / ToDo
- Werden in der produktiven Datenbank aktuell laufende Entleihungen mit Status `borrowed`/`due` geführt?
- Erreicht der Frontend-Call `/library/loans/current` die API (ggf. CORS/Auth/Proxy prüfen)?
- Muss das Widget auch erscheinen, wenn keine aktiven Entleihungen vorliegen (z. B. mit Platzhaltertext)?

## Nächste Schritte
1. In der produktiven Umgebung prüfen, ob die Route `/library/loans/current` Daten liefert (mit gültigem Token des aktiven Chors).
2. Falls die Antwort leer ist, in der DB eine Testentleihung anlegen oder prüfen, ob Status/Filter falsch gesetzt sind.
3. Falls der Call fehlschlägt, Proxy-/API-Konfiguration des Frontends überprüfen.
4. Optional: UX-Entscheidung treffen, ob das Widget auch ohne Entleihungen angezeigt werden soll (mit Hinweis „Keine Entleihungen aktiv“).
