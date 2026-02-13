# Performance-Optimierungen - NAK Chorleiter

## Übersicht
Basierend auf dem Lighthouse-Bericht vom 09.02.2026 wurden kritische Performance-Probleme identifiziert und behoben.

## Ausgangssituation (Lighthouse-Bericht)

### Kritische Metriken
- **First Contentful Paint (FCP)**: 7.1s (Score: 0.01) ❌
- **Time to Interactive (TTI)**: 30.2s (Score: 0) ❌
- **Total Blocking Time (TBT)**: 4,310ms (Score: 0.01) ❌
- **JavaScript Execution Time**: 5.1s ❌
- **Main Thread Work**: 9.4s ❌
- **Cumulative Layout Shift (CLS)**: 0 (Score: 1.0) ✅

### Hauptprobleme
1. **Render-blocking CSS**: styles.css (442KB) blockiert das initiale Rendering
2. **Fehlende Font-Preconnects**: Google Fonts werden ohne DNS-Prefetch geladen
3. **Eager Loading**: Alle Features werden beim Start geladen (kein Code Splitting)
4. **Keine kritische CSS-Inline-Optimierung**

## Durchgeführte Optimierungen

### 1. Angular Build-Konfiguration (angular.json)

#### Änderungen in Production-Build
```json
"optimization": {
  "scripts": true,
  "styles": {
    "minify": true,
    "inlineCritical": true  // ← Neu: Kritisches CSS wird inline eingebettet
  },
  "fonts": {
    "inline": true  // ← Neu: Kleine Fonts werden inline eingebettet
  }
}
```

**Effekt**: 
- Kritisches CSS wird im `<head>` inline eingebettet
- Nicht-kritisches CSS wird asynchron nachgeladen
- Reduziert Render-Blocking-Zeit deutlich

### 2. Font-Loading-Optimierung (index.html)

#### Hinzugefügte Preconnects
```html
<!-- Preconnect to critical domains for faster font loading -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
```

**Effekt**:
- DNS-Auflösung erfolgt parallel zum HTML-Parsing
- TCP/TLS-Handshake wird vorab durchgeführt
- Google Fonts laden ~100-500ms schneller

### 3. Service Worker Cache-Strategie (ngsw-config.json)

#### Erweiterte Asset-Gruppe
```json
{
  "name": "assets",
  "installMode": "lazy",
  "updateMode": "prefetch",
  "resources": {
    "files": [...],
    "urls": [
      "https://fonts.googleapis.com/**",
      "https://fonts.gstatic.com/**"
    ]
  }
}
```

**Effekt**:
- Google Fonts werden nach dem ersten Laden gecacht
- Offline-Verfügbarkeit der Fonts
- Wiederholte Besuche laden Fonts aus dem Cache (0ms)

### 4. Lazy Loading für Features (app-routing.module.ts)

#### Vorher: Eager Loading
```typescript
import { DashboardComponent } from './features/home/dashboard/dashboard.component';
import { LiteratureListComponent } from './features/literature/literature-list/literature-list.component';
// ... 15+ weitere Imports

{ path: 'dashboard', component: DashboardComponent }
```

#### Nachher: Lazy Loading
```typescript
// Keine direkten Imports mehr!

{ 
  path: 'dashboard',
  loadComponent: () => import('./features/home/dashboard/dashboard.component')
    .then(m => m.DashboardComponent)
}
```

**Konvertierte Routen zu Lazy Loading**:
- ✅ Dashboard
- ✅ Collections (List, Edit, Pieces)
- ✅ Events
- ✅ Dienstplan
- ✅ Verfügbarkeiten
- ✅ Statistiken
- ✅ Bibliothek (inkl. Entleihkorb)
- ✅ Stück-Details
- ✅ Suche
- ✅ Profil
- ✅ Chormitglieder
- ✅ Beteiligung
- ✅ Chor-Verwaltung

**Effekt**:
- Initial Bundle: ~40-60% kleiner (geschätzt)
- Jede Route lädt nur ihren eigenen Code
- Schnellerer First Contentful Paint

### 5. Preload-Strategie (main.ts)

#### Router-Konfiguration
```typescript
provideRouter(
  AppRoutingModule.routes, 
  withPreloading(PreloadAllModules)  // ← Neu
)
```

**Effekt**:
- Nach Initial-Load werden alle Lazy Modules im Hintergrund vorgeladen
- Balance zwischen Initial Performance und nachträglicher UX
- Keine Wartezeit bei Navigation zu bereits vorgeladenen Routen

## Erwartete Verbesserungen

### Lighthouse-Metriken (Schätzung)
| Metrik | Vorher | Nachher (erwartet) | Verbesserung |
|--------|--------|-------------------|--------------|
| FCP | 7.1s | 2-3s | ~60-70% ⬆️ |
| TTI | 30.2s | 8-12s | ~60-70% ⬆️ |
| TBT | 4,310ms | 1,000-1,500ms | ~65-75% ⬆️ |
| Bundle Size | ~2.5MB | ~1.2-1.5MB initial | ~40-50% ⬇️ |

### Nutzerwahrnehmung
- **Initiales Laden**: Deutlich schneller sichtbare Inhalte
- **Interaktivität**: Früher reagierende UI
- **Navigation**: Nahtlos durch Preloading
- **Mobile Performance**: Signifikant verbessert

## Testing & Validierung

### Produktions-Build testen
```bash
cd choir-app-frontend
npm run build
# Dann mit lokalem Server testen und neuen Lighthouse-Report erstellen
```

### Entwicklungs-Build (Development)
**Wichtig**: Diese Optimierungen greifen nur im Production-Build!
```bash
npm run build -- --configuration=production
```

### Lighthouse erneut ausführen
```bash
npx lighthouse http://localhost:4200 --view --only-categories=performance
```

## Weitere Optimierungsmöglichkeiten

### Kurzfristig
1. **Image Optimization**: WebP-Format für Bilder verwenden
2. **Compression**: Gzip/Brotli auf Server aktivieren (falls noch nicht aktiv)
3. **HTTP/2**: Sicherstellen, dass Server HTTP/2 nutzt

### Mittelfristig
1. **Tree-shaking**: Ungenutzte Material-Components identifizieren und entfernen
2. **Bootstrap**: Prüfen ob gesamtes Bootstrap benötigt wird oder nur Teile
3. **Critical CSS manuell optimieren**: Für Above-the-Fold-Inhalte

### Langfristig
1. **Angular Zoneless**: Auf zoneless Angular migrieren (Angular 18+)
2. **Standalone Components**: Alle verbleibenden Module-based Components konvertieren
3. **SSR/Prerendering**: Server-Side Rendering für schnelleren Initial Paint

## Rollback

Falls Probleme auftreten, können die Änderungen rückgängig gemacht werden:

```bash
git checkout HEAD~1 -- choir-app-frontend/angular.json
git checkout HEAD~1 -- choir-app-frontend/src/index.html
git checkout HEAD~1 -- choir-app-frontend/ngsw-config.json
git checkout HEAD~1 -- choir-app-frontend/src/app/app-routing.module.ts
git checkout HEAD~1 -- choir-app-frontend/src/main.ts
```

## Änderungsdatum
09.02.2026

## Quellen
- Lighthouse Report: `localhost_2026-02-09_01-41-03.report.html`
- [Angular Optimization Guide](https://angular.dev/best-practices/runtime-performance)
- [Web Vitals](https://web.dev/vitals/)
