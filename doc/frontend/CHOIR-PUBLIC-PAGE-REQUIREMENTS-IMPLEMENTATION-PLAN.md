# Chor-Vorstellungsseite – Requirements & Implementierungsplan

**Stand:** 2026-02-26  
**Status:** Entwurf zur Umsetzung  
**Kontext:** Angular 20 Frontend + Node/Express/Sequelize Backend

---

## 1) Zielbild

Chöre erhalten eine öffentlich erreichbare Vorstellungsseite (ohne App-Frame), die durch Chor-Admins im Bereich **"Mein Chor"** aktiviert, konfiguriert und veröffentlicht werden kann.

Die Lösung soll:
- mehrere Templates unterstützen (z. B. `classic`, `hero`, `gallery`),
- ein individuelles Farbschema ermöglichen,
- mobilfreundlich und barrierearm sein,
- veröffentlichte Inhalte stabil und performant ausliefern.

---

## 2) Scope

## 2.1 In Scope (MVP + Erweiterung)

1. Öffentliche Chorseite unter `/c/:slug` (ohne Main-Layout-Frame)
2. Template-Auswahl und Template-spezifisches Rendering
3. Aktivieren/Deaktivieren + Entwurf/Veröffentlicht
4. Slug-Verwaltung inkl. Verfügbarkeitsprüfung
5. Inhaltsblöcke (Text/Bild/CTA)
6. Asset-Upload (Bild)
7. **Individuelles Farbschema** je Chorseite
8. Basale SEO-Felder (Title, Description, OG-Bild)

## 2.2 Out of Scope (später)

- Vollständiges WYSIWYG/CMS mit komplexen Layout-Editoren
- Mehrsprachigkeit (DE/EN pro Seite)
- Versionierung mit Zeitreise/Restore
- A/B-Testing

---

## 3) Fachliche Anforderungen (Functional Requirements)

## FR-01 Öffentliche Auslieferung
- System MUSS veröffentlichte und aktivierte Chorseiten über `/c/:slug` ausliefern.
- Nicht veröffentlichte oder deaktivierte Seiten MÜSSEN `404` liefern.

## FR-02 Frame-freie Darstellung
- Öffentliche Chorseiten DÜRFEN nicht innerhalb des Main-App-Layouts (Header/Sidenav/Profile) erscheinen.
- Routing MUSS vor dem App-Shell-Routing abgefangen werden.

## FR-03 Template-System
- Chor-Admin MUSS mindestens zwischen `classic`, `hero`, `gallery` wechseln können.
- Inhaltsdaten MÜSSEN beim Template-Wechsel erhalten bleiben (soweit kompatibel).

## FR-04 Inhaltsverwaltung
- Chor-Admin MUSS Inhalte bearbeiten können:
  - Headline/Subheadline
  - Inhaltsblöcke (Titel/Text/Bild/CTA)
  - Kontaktinformationen
  - SEO-Felder

## FR-05 Asset-Management
- Chor-Admin MUSS Bilder hochladen und löschen können.
- Asset-Metadaten (Alt-Text, Reihenfolge) SOLLTEN verwaltbar sein.

## FR-06 Slug-Management
- Chor-Admin MUSS Slug anlegen/ändern können.
- System MUSS Verfügbarkeit prüfen und Konflikte verhindern.

## FR-07 Veröffentlichungsworkflow
- Chor-Admin MUSS Seite als Entwurf speichern können.
- Chor-Admin MUSS Seite gezielt veröffentlichen/unveröffentlichen können.

## FR-08 Farbschema pro Chorseite
- Chor-Admin MUSS ein individuelles Farbschema wählen können.
- System MUSS Presets anbieten UND benutzerdefinierte Farben erlauben.
- Farbschema MUSS auf öffentlicher Seite sofort wirksam sein.

## FR-09 Usability-Funktionen (Soll)
- Live-Vorschau für Mobil/Desktop SOLL bereitgestellt werden.
- URL-Kopieren und QR-Code SOLLEN verfügbar sein.

---

## 4) Nicht-funktionale Anforderungen (NFR)

## NFR-01 Performance
- Öffentliche Seite SOLL mit optimierten Bildern und geringer Render-Blockierung laden.
- Zielwert (Richtwert): LCP < 2.5s auf typischem Mobilgerät.

## NFR-02 Sicherheit
- Schreibzugriffe nur für Chor-Admins / globale Admins.
- Eingaben MÜSSEN serverseitig validiert/sanitized werden.
- Upload-Validierung (MIME, Größe, Dateiendung) MUSS greifen.

## NFR-03 Barrierefreiheit
- Kontrastwerte für benutzerdefinierte Farben MÜSSEN geprüft werden.
- Interaktive Elemente MÜSSEN per Tastatur nutzbar sein.
- Bilder SOLLTEN Alt-Texte unterstützen.

## NFR-04 Wartbarkeit
- Gemeinsame Basislogik zwischen Templates MUSS zentral bleiben.
- Template-spezifische Logik DARF nur in klar abgegrenzten Bereichen liegen.

## NFR-05 Kompatibilität
- Lösung MUSS mit vorhandenem Angular/Express/Sequelize Stack kompatibel sein.

---

## 5) Datenmodell-Erweiterung

## 5.1 `choir_public_page`
Zusätzliche Felder:
- `theme` (JSON):
  - `primaryColor`
  - `secondaryColor`
  - `accentColor`
  - `backgroundColor`
  - `textColor`
  - optional `buttonStyle`
- `templateKey` (`classic|hero|gallery`)
- `contentBlocks` (JSON)
- `isEnabled`, `isPublished`, `slug`, SEO-Felder, Kontakt

## 5.2 Validierungsregeln für `theme`
- Hex-Format `#RRGGBB`
- Optionale Kontrastprüfung (WCAG AA) für Text auf Hintergrund
- Fallback auf Standardwerte bei ungültigen Eingaben

---

## 6) API-Anforderungen

## 6.1 Öffentliche API
- `GET /api/public/choirs/:slug`
  - liefert: `choir`, `page`, `assets`, `theme`

## 6.2 Admin API (choir-management)
- `GET /api/choir-management/public-page`
- `PUT /api/choir-management/public-page`
  - erweitert um `theme`
- `GET /api/choir-management/public-page/slug-availability`
- `POST /api/choir-management/public-page/assets`
- `DELETE /api/choir-management/public-page/assets/:assetId`

## 6.3 Fehlerfälle
- `400` bei ungültigem Slug/Theme-Payload
- `403` bei fehlender Berechtigung
- `404` bei nicht vorhandener/ungültiger öffentlicher Seite
- `409` bei Slug-Konflikt

---

## 7) Frontend-Anforderungen

## 7.1 Public Page Rendering
- Route `/c/:slug` als Top-Level Route (nicht im MainLayout-Tree)
- Template-Renderer mit:
  - shared base sections
  - template-spezifischen Komponenten/Layouts

## 7.2 Theme-Anwendung
- Theme als CSS-Variablen auf Wrapper-Ebene setzen (z. B. `--cp-primary`, `--cp-bg`)
- Buttons, Hero-Hintergründe, Links, Cards auf Variablen umstellen

## 7.3 Admin-Editor (Mein Chor)
Zusätzliche UI-Felder:
- Preset-Auswahl (`Classic Blue`, `Warm Choir`, `Dark Elegant`)
- Individuelle Farbwahl (Color-Picker + Hex Input)
- Kontrast-Hinweis bei problematischen Kombinationen
- Live-Vorschau (optional MVP+)

---

## 8) Benutzerfreundliche Zusatzfunktionen (Empfohlen)

Priorisierte Liste:
1. **Farbschema Presets + Custom Farben** (hoch)
2. **Mobil/Desktop-Vorschau Toggle** (hoch)
3. **Block-Reihenfolge per Drag&Drop** (hoch)
4. **Block sichtbar/unsichtbar Toggle** (mittel)
5. **SEO-Helfer mit Längenindikator** (mittel)
6. **URL kopieren + QR-Code** (mittel)
7. **Template-Wechsel mit Kompatibilitätswarnung** (mittel)
8. **Änderungshistorie / Undo** (niedriger, aber wertvoll)

---

## 9) Implementierungsplan (Phasen)

## Phase 1 – Stabilisierung Routing & Shell-Trennung
**Ziel:** Öffentliche Seiten sind garantiert frame-frei.

Aufgaben:
- Public Routen auf Top-Level sicherstellen (`/c/:slug`, `/shared-piece/:token`)
- MainLayout-Fallback nur als Sicherheitsnetz beibehalten
- E2E-Test: Kein Header/Sidenav auf `/c/:slug`

Ergebnis:
- Öffentliche Seiten zuverlässig ohne App-Shell

---

## Phase 2 – Farbschema Backend + API
**Ziel:** Theme-Daten vollständig speicher- und lieferbar.

Aufgaben:
- `theme` in Modell + Migration ergänzen
- Validation/Sanitizing für Theme-Farben
- `PUT/GET public-page` auf `theme` erweitern
- Unit-Tests für Theme-Validierung

Ergebnis:
- Persistentes, validiertes Farbschema pro Chorseite

---

## Phase 3 – Farbschema Frontend + Hero-Härtung
**Ziel:** Sichtbare Theme-Anwendung im Public Rendering.

Aufgaben:
- CSS-Variablen-Strategie implementieren
- Hero-Template auf Variablen umstellen
- Fallbacks für fehlende Theme-Werte
- Accessibility-Kontrast-Hinweise im Editor

Ergebnis:
- Benutzerdefinierte Farben wirken zuverlässig im Frontend

---

## Phase 4 – Usability-Funktionen (MVP+)
**Ziel:** Höhere Nutzerfreundlichkeit für Chor-Admins.

Aufgaben:
- Presets + Custom Picker
- URL copy + QR
- Drag&Drop Block-Reihenfolge
- Sichtbarkeits-Toggle je Block

Ergebnis:
- Deutlich bessere Baukasten-Erfahrung

---

## Phase 5 – Qualitätssicherung & Rollout
**Ziel:** Sichere Einführung in Produktion.

Aufgaben:
- Backend Tests (Slug, Berechtigungen, Theme-Validation)
- Frontend Tests (Template Rendering, Theme-Apply)
- Build + Smoke-Test auf `/c/:slug`
- Deployment inkl. PWA-Cache-Update-Kommunikation

Ergebnis:
- Produktionsreife mit klarer Abnahmedefinition

---

## 10) Akzeptanzkriterien (Definition of Done)

1. `/c/:slug` zeigt keine App-Navigation/Toolbar/Profile
2. Chor-Admin kann Farben speichern und sieht sie auf Public Page
3. Ungültige Theme-Payload wird serverseitig mit `400` abgelehnt
4. Hero-, Classic- und Gallery-Template funktionieren mit Theme
5. Build und Tests laufen erfolgreich
6. Dokumentation im Repo ist aktuell

---

## 11) Risiken & Gegenmaßnahmen

- **Risiko:** Farbwahl führt zu schlechter Lesbarkeit  
  **Maßnahme:** Kontrastchecker + Warnung + Auto-Fallback

- **Risiko:** Template-Logik wird unübersichtlich  
  **Maßnahme:** Shared Base + klar getrennte Template-Komponenten

- **Risiko:** PWA zeigt altes Layout nach Deploy  
  **Maßnahme:** SW-Update-Hinweis + Cache-Busting-Kommunikation

---

## 12) Technische Tasks (kurz, sprintfähig)

- [ ] Backend: `theme` Feld + Validation + Tests
- [ ] Frontend: Theme-Model erweitern
- [ ] Frontend: Editor-Felder für Presets/Custom Farben
- [ ] Public Rendering: CSS-Variablen anwenden
- [ ] Hero Template: finaler visuelle Feinschliff + responsive
- [ ] E2E: Frameless-Assertion auf `/c/:slug`
- [ ] Doku: API-Beispiele + Admin-Guide

---

## 13) Entscheidungsempfehlung

**Empfohlen:** Umsetzung in 2 Sprints
- **Sprint 1:** Phase 1–3 (Routing hart, Theme End-to-End)
- **Sprint 2:** Phase 4–5 (Usability, Tests, Rollout)

Damit werden sowohl die aktuellen Probleme (Frame + Hero-Qualität) als auch die gefragte Differenzierung (individuelles Farbschema) belastbar gelöst.
