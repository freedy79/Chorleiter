# 🚀 PWA Quick Reference

## Installation & Setup

```bash
# 1. In choir-app-frontend navigieren
cd choir-app-frontend

# 2. Health Check durchführen
npm run pwa-health-check

# 3. Development Server starten
npm start
# App ist unter http://localhost:4200 verfügbar
```

## Häufige Befehle

```bash
# Production Build mit PWA
npm run build:prod

# Icons konvertieren (falls nötig)
npm run icons:convert

# PWA Gesundheitsprüfung
npm run pwa-health-check

# Tests ausführen
npm test

# Lighthouse Audit (benötigt Chrome)
npm run lighthouse
npm run lighthouse:mobile
```

## Features testen

### ✅ Kernfeatures (Kurzüberblick)
- Installation auf iOS, Android und Desktop
- Offline-Funktionalität durch Service Worker
- Automatische Updates mit Benachrichtigung
- App-Icons in verschiedenen Größen
- Standalone-Modus für App-Feeling

### 🔄 Update-System
1. App öffnen: http://localhost:4200
2. DevTools öffnen (F12)
3. Service Workers auf "Application" prüfen
4. Nach ~30min oder manueller Trigger auf Update prüfen
5. "Aktualisieren" Button klicken

### 📱 Installation testen
**Desktop:**
- Chrome: Installationssymbol in der Adressleiste klicken
- Edge: Menü > Apps > Diese App installieren

**Mobile:**
- Android: Chrome Menu > Install app
- iOS: Share > Add to Home Screen (in Safari)

### 🔌 Offline-Modus
1. DevTools öffnen (F12)
2. Network Tab > Throttling auf "Offline" stellen
3. Seite neu laden (Ctrl+R)
4. App sollte teilweise funktionieren
5. "Offline" Badge oben sollte angezeigt werden

## 📁 Wichtige Dateien

| Datei | Beschreibung |
|-------|-------------|
| `public/manifest.webmanifest` | PWA Manifest |
| `ngsw-config.json` | Service Worker Config |
| `src/app/services/service-worker-update.service.ts` | Update-Service |
| `src/app/components/pwa-update-notification/` | Update-UI |
| `src/app/components/offline-indicator/` | Offline-Anzeige |
| `scripts/pwa-health-check.js` | Validation-Tool |

## 🎨 Icons verwalten

Icons sind in: `public/assets/icons/`

**Verfügbare Icons:**
- `icon-96x96.png`, `icon-144x144.png`, `icon-192x192.png`, `icon-512x512.png`
- `icon-*-maskable.png` (für Android)
- `shortcut-*.png` (App-Shortcuts)
- `screenshot-*.png` (App-Store Preview)

**Neue Icons erstellen:**
```bash
# SVG-Icons generieren
node generate-pwa-icons.js

# Zu PNG konvertieren
npm run icons:convert
```

## 🔐 Production Deployment

### Server-Header (wichtig!)

**Apache (.htaccess):**
```apache
<FilesMatch "\.(js|css|png|jpg|gif|svg|woff)$">
  Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

<FilesMatch "(ngsw.json|ngsw-worker.js|manifest.webmanifest)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
```

**Nginx:**
```nginx
location ~ (ngsw\.json|ngsw-worker\.js|manifest\.webmanifest)$ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### HTTPS erforderlich!
Die PWA funktioniert **nur** über HTTPS (außer localhost).

## 🐛 Häufige Probleme

| Problem | Lösung |
|---------|--------|
| Service Worker lädt nicht | HTTP statt HTTPS? Cache leeren? |
| Icons werden nicht angezeigt | Pfade überprüfen? PNG-Format ok? |
| Update wird nicht erkannt | Service Worker aktiv? Build aktuell? |
| Offline-Modus funktioniert nicht | Cache-Config überprüfen? Routes gecacht? |
| Installation nicht möglich | HTTPS + Manifest required |

## ✅ Pre-Flight Checks

```bash
# Automatische Überprüfung
npm run pwa-health-check
```

Alle Tests sollten grün sein (✅).

## 📊 Monitoring

### Service Worker Status (Browser Console)
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('SWs aktiv:', regs.length);
  regs.forEach(r => console.log(r.scope, r.active?.state));
});
```

### Cache-Inhalt prüfen
DevTools > Application > Cache Storage > Durchsuchen

## 📚 Dokumentation

- **PWA-TESTING-GUIDE.md** - Umfangreicher Testing Guide mit allen Checklisten

## 🎯 Schnelle Links

- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Angular Service Worker Docs](https://angular.io/guide/service-worker-intro)
- [manifest.webmanifest Spec](https://www.w3.org/TR/appmanifest/)

## 📞 Support

Bei Fragen:
1. Browser-Konsole auf Fehler prüfen
2. DevTools > Application Tab überprüfen
3. PWA Health Check durchführen
4. Dokumentation konsultieren

---

**Letztes Update**: Feb 2026 | **Status**: ✅ Produktionsbereit
