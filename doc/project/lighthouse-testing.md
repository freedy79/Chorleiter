# Lighthouse Performance Testing - Anleitung

## Voraussetzungen

Die App muss lokal laufen:
```bash
npm run startwithtimestamp
```

## Lighthouse Scripts

### 1. Desktop Audit (mit Browser-Ansicht)
```bash
npm run lighthouse
```
- Öffnet automatisch den Report im Browser
- Desktop-Preset
- Testet: http://localhost:4200

### 2. Mobile Audit (empfohlen für Navigation-Testing)
```bash
npm run lighthouse:mobile
```
- Mobile Emulation (typisches 4G Netzwerk)
- CPU 4x gedrosselt (simuliert schwächere Geräte)
- Fokus auf Performance
- Öffnet Report im Browser

### 3. CI/CD Pipeline Audit
```bash
npm run lighthouse:ci
```
- Generiert JSON + HTML Reports
- Speichert unter: `./lighthouse-report.html` und `./lighthouse-report.json`
- Kein Browser-Popup (für automatisierte Tests)

## Manuell Lighthouse ausführen

### Chrome DevTools (einfachste Methode)

1. App starten: `npm run startwithtimestamp`
2. Chrome öffnen: `http://localhost:4200`
3. DevTools öffnen: `F12`
4. Tab "Lighthouse" auswählen
5. Einstellungen:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
   - ✅ PWA
   - Device: **Mobile** (für Navigation-Test)
6. "Analyze page load" klicken

### CLI mit erweiterten Optionen

```bash
# Mobile mit spezifischen Metriken
npx lighthouse http://localhost:4200 \
  --emulated-form-factor=mobile \
  --throttling-method=devtools \
  --throttling.cpuSlowdownMultiplier=4 \
  --only-categories=performance,accessibility \
  --view

# Spezifische Viewport-Größe (z.B. iPhone 14)
npx lighthouse http://localhost:4200 \
  --emulated-form-factor=mobile \
  --screenEmulation.mobile=true \
  --screenEmulation.width=390 \
  --screenEmulation.height=844 \
  --view

# Mit Budget-Datei (für CI/CD)
npx lighthouse http://localhost:4200 \
  --budget-path=./lighthouse-budget.json \
  --output=json \
  --output-path=./lighthouse-results.json
```

## Wichtige Metriken für Mobile Navigation

### Performance Metriken

| Metrik | Zielwert | Kritisch für |
|--------|----------|--------------|
| **First Contentful Paint (FCP)** | < 1.5s | Initiale Ladezeit |
| **Largest Contentful Paint (LCP)** | < 2.5s | Wahrgenommene Performance |
| **Total Blocking Time (TBT)** | < 300ms | Interaktivität |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Layout-Stabilität |
| **Speed Index** | < 3.0s | Visuelle Vollständigkeit |
| **Time to Interactive (TTI)** | < 3.5s | Nutzbarkeit |

### Accessibility Checks

- ✅ ARIA-Labels vorhanden
- ✅ Touch Targets ≥ 48x48px
- ✅ Farbkontrast ≥ 4.5:1
- ✅ Keyboard Navigation
- ✅ Focus-Indikatoren

### PWA Checks

- ✅ Service Worker registriert
- ✅ Manifest vorhanden
- ✅ Icons in allen Größen
- ✅ Offline-Fallback

## Budget-Datei erstellen

Erstelle `lighthouse-budget.json` für automatisierte Checks:

```json
[
  {
    "path": "/*",
    "timings": [
      {
        "metric": "interactive",
        "budget": 3500
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1500
      }
    ],
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 300
      },
      {
        "resourceType": "stylesheet",
        "budget": 50
      },
      {
        "resourceType": "image",
        "budget": 200
      }
    ],
    "resourceCounts": [
      {
        "resourceType": "third-party",
        "budget": 10
      }
    ]
  }
]
```

## Interpretation der Ergebnisse

### Score-Skala
- **90-100**: Grün (Excellent)
- **50-89**: Orange (Needs Improvement)
- **0-49**: Rot (Poor)

### Typische Probleme und Lösungen

#### Problem: Hoher TBT (Total Blocking Time)
**Ursache**: Zu viel JavaScript während des Ladens
**Lösung**:
- Code-Splitting implementieren
- Lazy Loading für Module
- OnPush Change Detection

#### Problem: Großer FCP (First Contentful Paint)
**Ursache**: Große Bundles, langsame Server-Antwort
**Lösung**:
- Tree-Shaking optimieren
- Preload kritische Resources
- CDN verwenden

#### Problem: Hoher CLS (Cumulative Layout Shift)
**Ursache**: Images ohne Dimensionen, Dynamic Content
**Lösung**:
- Width/Height für alle Images
- Skeleton Screens verwenden
- CSS containment

## Testing-Workflow

### Vor jedem Release

1. **Baseline erstellen**
   ```bash
   npm run lighthouse:ci
   mv lighthouse-report.html reports/baseline-$(date +%Y%m%d).html
   ```

2. **Änderungen testen**
   - Mobile Navigation Änderungen implementieren
   - Neuen Report erstellen
   ```bash
   npm run lighthouse:mobile
   ```

3. **Vergleichen**
   - Scores vergleichen
   - Regression-Checks
   - Metriken dokumentieren

### Continuous Integration

In `.github/workflows/lighthouse.yml`:
```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx http-server ./dist/choir-app-frontend -p 8080 &
      - run: npm run lighthouse:ci
      - uses: actions/upload-artifact@v3
        with:
          name: lighthouse-report
          path: lighthouse-report.html
```

## Mobile Navigation spezifische Tests

### Test-Szenarien

1. **Bottom Navigation Performance**
   - First Paint der Bottom Nav
   - Tap Response Time
   - Animation Performance (60fps?)

2. **Sidenav Animation**
   - Öffnen/Schließen-Zeit
   - Frame Rate während Animation
   - Memory Leaks?

3. **Search Expand/Collapse**
   - Transition Smoothness
   - Re-Layout Performance

4. **Choir Switcher Bottom Sheet**
   - Open-Time
   - Scroll Performance
   - Close-Animation

### Custom Audits erstellen

Für spezifische Navigation-Tests kann man Custom Audits schreiben:

```javascript
// custom-audits/bottom-nav-performance.js
module.exports = {
  id: 'bottom-nav-tap-response',
  title: 'Bottom Navigation Tap Response Time',
  failureTitle: 'Bottom Navigation is too slow',
  description: 'Measures tap-to-navigation time for bottom nav items',
  
  requiredArtifacts: ['traces'],
  
  async audit(artifacts) {
    // Analysiere Traces für tap events auf .bottom-nav-item
    const tapToNavigationTime = 50; // ms
    
    const passed = tapToNavigationTime < 100;
    
    return {
      score: passed ? 1 : 0,
      numericValue: tapToNavigationTime,
      displayValue: `${tapToNavigationTime}ms`,
    };
  }
};
```

## Reports speichern und teilen

### HTML Report
```bash
npm run lighthouse:mobile
# Report öffnet sich automatisch
# Gespeichert als: lighthouse-report.html
```

### JSON für Analyse
```bash
npm run lighthouse:ci
# lighthouse-report.json kann programmatisch analysiert werden
```

### Vergleichs-Tool
```bash
# Lighthouse CI Compare Tool
npx lhci compare \
  --reports=./reports/before.json \
  --reports=./reports/after.json
```

## Troubleshooting

### "Port 4200 not found"
**Lösung**: App muss laufen
```bash
npm run startwithtimestamp
# In neuem Terminal:
npm run lighthouse:mobile
```

### "Chrome not found"
**Lösung**: Lighthouse braucht Chrome/Chromium
```bash
# Mit spezifischem Chrome-Pfad
npx lighthouse http://localhost:4200 \
  --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

### Inkonsistente Ergebnisse
**Lösung**: 
- Mehrere Runs (3-5x) und Durchschnitt bilden
- Background-Prozesse beenden
- CPU/Network nicht anderweitig nutzen

---

## Ressourcen

- [Lighthouse Docs](https://developer.chrome.com/docs/lighthouse/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Budget Calculator](https://perf-budget-calculator.firebaseapp.com/)

---

**Zuletzt aktualisiert**: Februar 2026  
**Für**: NAK Chorleiter Mobile Navigation Testing
