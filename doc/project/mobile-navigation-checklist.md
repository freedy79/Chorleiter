# Mobile Navigation - Implementierungs-Checkliste

## Phase 1: Bottom Navigation ✅

- [x] Bottom Navigation HTML-Template erstellt
- [x] Maximal 5 wichtigste Items implementiert
- [x] Dynamische Anzeige basierend auf Rolle (isAdmin$, isLibrarian$)
- [x] Overflow-Menü für zusätzliche Items
- [x] Active State mit Top-Indicator-Bar
- [x] Icon-Vergrößerung bei Active (scale 1.1)
- [x] Responsive Labels (versteckt bei XS)
- [x] Ripple-Effekt auf Items
- [x] CSS-Animationen optimiert
- [ ] Unit Tests für Bottom Nav
- [ ] E2E Tests für Navigation Flow

## Phase 2: Hamburger-Menü (Sidenav) ✅

- [x] Animation auf 200ms (Mobile) / 250ms (Desktop) reduziert
- [x] Breite optimiert: 85vw (max 320px) auf Mobile
- [x] Backdrop-Click Handler implementiert
- [x] Auto-Close bei Navigation auf Handsets
- [ ] Swipe-to-Close Geste (zukünftig)
- [ ] Hierarchische Menü-Struktur optimieren
- [ ] Wichtigste Items nach oben sortieren
- [ ] Unit Tests für Sidenav

## Phase 3: Mobile Toolbar ✅

- [x] Expandable Search implementiert
- [x] Search-Icon für collapsed State
- [x] Search Animation (200ms slide-in)
- [x] Choir Switcher als Bottom Sheet (Mobile)
- [x] Choir Switcher als Dropdown (Desktop)
- [x] ChoirSwitcherSheetComponent erstellt
- [ ] Breadcrumb-Navigation für tiefe Hierarchien
- [ ] Overflow-Menü für seltene Toolbar-Aktionen
- [ ] Unit Tests für Toolbar Components

## Phase 4: FAB (Floating Action Button) ✅

- [x] FAB Standalone Component erstellt
- [x] Speed-Dial-Menü implementiert
- [x] Auto-Hide beim Scrollen (configurable)
- [x] Position responsive (80px/24px bottom)
- [x] Animationen (scale, fade, slide)
- [ ] FAB in relevante Features integrieren (Repertoire, Programme)
- [ ] Kontextsensitive Aktionen je nach Route
- [ ] Unit Tests für FAB Component

## Phase 5: Responsive Breakpoints ✅

- [x] Breakpoints-Datei erstellt (_breakpoints.scss)
- [x] Handset: < 600px
- [x] Tablet: 600px - 1024px
- [x] Desktop: > 1024px
- [x] SCSS Mixins für Media Queries
- [x] TypeScript Config (navigation.config.ts)
- [x] Layout Constants definiert
- [ ] Breakpoints in allen Components anwenden
- [ ] Breakpoint Observer Service erweitern

## Phase 6: Navigation Patterns

- [x] Back-Button-Handling (Browser History)
- [x] Auto-Close Sidenav bei Navigation
- [ ] Deep-Linking für alle Routen testen
- [ ] State Preservation implementieren
- [ ] Smooth Scroll-Behavior global aktivieren
- [ ] Router Guards für Protected Routes

## Phase 7: Tab-Navigation (zukünftig)

- [ ] Swipeable Tabs implementieren
- [ ] Sticky Tabs beim Scrollen
- [ ] Scroll-Indikator bei vielen Tabs
- [ ] Mobile: Max. 3-4 Tabs, Rest in "Mehr"
- [ ] Tab-Animation optimieren

## Phase 8: Dokumentation ✅

- [x] Mobile Navigation Dokumentation (mobile-navigation.md)
- [x] Figma Design Specs (figma-design-specs.md)
- [x] Breakpoints Dokumentation
- [x] Navigation Config Dokumentation
- [x] Verwendungsbeispiele und Code-Snippets
- [x] Best Practices für Entwickler
- [ ] Video-Tutorial für neue Entwickler
- [ ] Wiki-Seite im internen Confluence

## Phase 9: Testing

### Unit Tests
- [ ] MainLayoutComponent Tests erweitern
- [ ] ChoirSwitcherSheetComponent Tests
- [ ] FAB Component Tests
- [ ] Navigation Service Tests

### E2E Tests (Cypress)
- [ ] Bottom Nav Navigation Flow
- [ ] Choir Switcher Flow (Mobile)
- [ ] Search Expand/Collapse Flow
- [ ] FAB Click und Speed-Dial
- [ ] Sidenav Open/Close
- [ ] Responsive Behavior Tests

### Device Tests
- [ ] iPhone SE (320px width)
- [ ] iPhone 14 (390px width)
- [ ] Samsung Galaxy S23 (360px width)
- [ ] iPad Mini (768px width)
- [ ] iPad Pro (1024px width)

### Browser Tests
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] Firefox Mobile

## Phase 10: Performance

- [ ] Lighthouse Mobile Audit (Score > 90)
- [ ] Bundle Size Analysis
- [ ] Lazy Loading für Bottom Sheet
- [ ] Animation Performance (60fps)
- [ ] Touch Response Time (< 100ms)
- [ ] First Contentful Paint (< 1.5s)

## Phase 11: Accessibility (A11y)

- [x] ARIA-Labels für alle Buttons
- [x] Keyboard Navigation möglich
- [ ] Screen Reader Testing (VoiceOver, TalkBack)
- [ ] Focus-Trap in Modals
- [ ] Color Contrast Check (WCAG AA)
- [ ] Touch Targets min. 44px
- [ ] Skip Links implementieren

## Phase 12: User Testing

- [ ] Prototyp in Figma erstellen
- [ ] 5 User Tests durchführen (verschiedene Rollen)
- [ ] Heatmap-Analyse (Hotjar/Clarity)
- [ ] Task Completion Metrics sammeln
- [ ] SUS-Fragebogen ausfüllen lassen
- [ ] Feedback dokumentieren und priorisieren

## Phase 13: Zukünftige Features

### Swipe-Gesten
- [ ] Swipe-to-Close für Sidenav
- [ ] Swipe zwischen Tabs
- [ ] Pull-to-Refresh

### Progressive Web App
- [ ] Install-Prompt implementieren
- [ ] Offline-Modus aktivieren
- [ ] Service Worker optimieren
- [ ] Push-Notifications

### Adaptive Loading
- [ ] Bildkompression für langsame Verbindungen
- [ ] Lazy Loading für Bilder
- [ ] Code-Splitting erweitern

### Voice Navigation
- [ ] Web Speech API integrieren
- [ ] Voice Commands definieren

## Phase 14: Deployment

- [ ] Feature-Branch erstellen
- [ ] Code Review durchführen
- [ ] Merge in develop
- [ ] Staging Deployment
- [ ] QA Testing
- [ ] Production Deployment
- [ ] Monitoring aktivieren (Analytics, Errors)

## Metrics & Success Criteria

### Performance
- [ ] Lighthouse Mobile Score > 90
- [ ] Time to Interactive < 3s
- [ ] First Contentful Paint < 1.5s

### Usability
- [ ] Task Completion Rate > 95%
- [ ] Error Rate < 5%
- [ ] SUS Score > 75

### Engagement
- [ ] Bottom Nav Click Rate > 70%
- [ ] Search Usage +20%
- [ ] Bounce Rate -10%

---

## Notizen

### Offene Fragen
1. Sollen wir A/B-Testing für Bottom Nav Items durchführen?
2. Brauchen wir Custom Icons oder reichen Material Icons?
3. Soll der FAB auf allen Seiten oder nur kontextsensitiv erscheinen?

### Risiken
- ⚠️ Swipe-Gesten könnten mit Browser-Navigation kollidieren
- ⚠️ Bottom Sheet auf iOS < 15 könnte Performance-Probleme haben
- ⚠️ Zu viele Animationen könnten auf Low-End-Geräten laggen

### Dependencies
- Angular Material 17+
- RxJS 7+
- TypeScript 5+
- SCSS (Sass)

---

**Letzte Aktualisierung**: 9. Februar 2026  
**Status**: In Entwicklung  
**Owner**: Development Team  
**Reviewer**: UX/UI Team
