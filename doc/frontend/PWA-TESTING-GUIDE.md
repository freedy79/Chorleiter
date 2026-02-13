# PWA Testing & Deployment Guide

Schnellstart zum Testen und Deployen der PWA-Features.

## 🧪 Lokales Testing

### 1. Development Server starten

```bash
cd choir-app-frontend
npm start
# oder
ng serve
```

App ist verfügbar unter: http://localhost:4200

### 2. PWA Health Check durchführen

```bash
npm run pwa-health-check
# oder
node scripts/pwa-health-check.js
```

Dies überprüft automatisch:
- ✅ Manifest-Datei
- ✅ Icon-Dateien
- ✅ Service-Worker-Konfiguration
- ✅ Komponenten-Implementierung
- ✅ HTML-Meta-Tags

### 3. Lighthouse Audit durchführen

**Chrome/Chromium Browser:**

1. Öffne http://localhost:4200
2. Drücke **F12** (DevTools öffnen)
3. Wechsle zum Tab **Lighthouse**
4. Setze **Device** auf "Mobile" (wichtig für PWA-Test)
5. Aktiviere nur **PWA**-Checkbox
6. Klicke **Analyze page load**

Erwartete Ergebnisse:
- ✅ Web App Manifest
- ✅ Service Worker
- ✅ Installierbar
- ✅ HTTPS/protokoll (localhost OK)

### 4. Installation testen (Desktop)

**Chrome/Edge:**
1. Öffne http://localhost:4200
2. Klicke auf **Install** Icon in der Adressleiste (oder Menü)
3. Bestätige Installation
4. App wird im Startmenü/Launcher angezeigt

**Firefox:**
- Firefox hat noch keine vollständige PWA-Installation support
- App funktioniert aber über Firefox als PWA

### 5. Service Worker prüfen

In der **Browser-Konsole** (F12):

```javascript
// Alle registrierten Service Worker anzeigen
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('✅ Service Worker aktiviert');
    console.log('Scope:', reg.scope);
    console.log('Controller:', reg.controller?.state);
  });
});

// Oder in Application Tab:
// - Setzen Sie auf "Service Workers"
// - Sie sollten eine grüne "running" anzeige sehen
```

### 6. Offline-Funktionalität testen

**Chrome DevTools:**

1. Öffne **Devtools > Network Tab**
2. Ändere auf **Offline** (Dropdown "Throttling")
3. Aktualisiere Seite (Ctrl+R)
4. App sollte teilweise funktionieren
5. Überprüfe den **offline indicator** oben

**Oder nutze Service Worker selbst:**

```javascript
// In der Console
fetch('/api/...').then(r => r.json()).then(console.log);
// Sollte gecachte Daten zurückgeben auch offline
```

### 7. Cache-Inhalt prüfen

**Chrome DevTools > Application > Cache Storage:**

- `ngsw:db:version` - Service Worker Version
- `ngsw:cache:...` - Gecachte Dateien
- Inspiziere, welche Dateien gecacht sind

## 🔄 Update Testing

### Simuliere ein Update

```bash
# 1. Production Build
ng build --configuration production

# 2. Starte einen Webserver für die dist/
http-server dist/ --port 8080
# oder
cd dist && python -m http.server 8080

# 3. Öffne http://localhost:8080
# 4. Warte auf "Update verfügbar" Notification
# oder klicke "Aktualisieren" Button
```

### Automatisches Update-Checking

Der Service Worker überprüft alle 30 Minuten nach Updates.

**Manuell updaten in der Konsole:**

```javascript
// Manueller Update Check
navigator.serviceWorker.controller.postMessage({type: 'CHECK_FOR_UPDATES'});
```

## 📱 Mobile Testing

### Android (Chrome/Edge)

1. Telefon mit USB verbinden
2. Chrome > Menü > Mehr Tools > Remote devices
3. Lokale Netzwerk-IP verwenden (nicht localhost!)
4. Öffne http://192.168.x.x:4200 auf dem Telefon
5. Klicke Install-Prompt
6. App wird zum Homescreen hinzugefügt

### iOS (Safari)

1. iPhone mit URL verbinden
2. Öffne Safari
3. Navigiere zu http://192.168.x.x:4200
4. Klicke Teilen > Zum Homescreen hinzufügen
5. App wird auf dem Homescreen angezeigt

**Wichtig für iOS:**
- HTTPS wird benötigt (außer für localhost)
- Offline-Support ist begrenzt
- Theme-Color funktioniert

### Lokale IP für mobiles Testen

```bash
# Windows
ipconfig
# Suche nach IPv4 Address (z.B. 192.168.1.100)

# macOS/Linux
ifconfig
# Suche nach inet address
```

Dann starten Sie den Server:
```bash
ng serve --host 0.0.0.0 --disable-host-check
```

Und öffnen Sie http://[IHRE_IP]:4200 auf dem Handy.

## 🚀 Production Deployment

### 1. Production Build erstellen

```bash
ng build --configuration production
```

Das generiert:
- `dist/ngsw.json` - Service Worker Manifest
- `dist/ngsw-worker.js` - Service Worker
- `dist/manifest.webmanifest` - PWA Manifest

### 2. Server Konfiguration (wichtig!)

**Für Apache (.htaccess):**

```apache
# Cache-Control Headers
<FilesMatch "\.(js|css|png|jpg|gif|svg|woff|woff2|ttf|eot)$">
  Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

# Keine Caches für Service Worker und Manifests
<FilesMatch "(ngsw.json|ngsw-worker.js|manifest.webmanifest|index.html)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>

# SPA Routing
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**Für Nginx:**

```nginx
# Cache für Static Assets
location ~* \.(js|css|png|jpg|gif|svg|woff|woff2|ttf|eot)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Keine Cache für Service Worker
location ~ (ngsw\.json|ngsw-worker\.js|manifest\.webmanifest|index\.html)$ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# SPA Routing
location / {
  try_files $uri $uri/ /index.html;
}
```

### 3. HTTPS aktivieren (erforderlich!)

Die PWA funktioniert nur über HTTPS (außer localhost).

**Mit Let's Encrypt:**

```bash
# Verwende Certbot
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

### 4. Deployen auf den Server

```bash
# Kopiere dist/ Inhalte zu Web-Root
rsync -av --delete dist/ user@server:/var/www/choir-app/

# Oder mit FTP/SFTP
# Oder mit Git
git push origin main
```

### 5. Post-Deployment Tests

```bash
# 1. Überprüfe HTTPS
https://yourdomain.com

# 2. Lighthouse Audit erneut durchführen
# DevTools > Lighthouse > PWA

# 3. Teste Installation
# Sollte Install-Prompt anzeigen

# 4. Teste Offline
# DevTools > Network > Offline
# Sollte teilweise funktionieren

# 5. Service Worker überprüfen
# DevTools > Application > Service Workers
# Status sollte "running" sein
```

## ✅ Checklist vor Release

- [ ] PWA Health Check besteht alle Tests
- [ ] Lighthouse Audit zeigt 100% PWA Score
- [ ] Icons sind in allen Größen verfügbar
- [ ] Manifest.webmanifest ist valide
- [ ] Installation auf Desktop funktioniert
- [ ] Installation auf Android funktioniert
- [ ] Installation auf iOS funktioniert
- [ ] Offline-Modus funktioniert
- [ ] Update-Notification wird angezeigt
- [ ] HTTPS ist aktiviert (auf Production)
- [ ] Cache-Header sind korrekt konfiguriert
- [ ] Service Worker erscheint als "running"

## 🔍 Debugging

### Service Worker nicht laden?

1. **HTTPS überprüfen** - Nur auf https funktioniert (außer localhost)
2. **Cache leeren** - DevTools > Application > Storage > Clear site data
3. **Service Worker deregistrieren:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   // Seite neuladen
   ```
4. **Browser Console** auf Fehler prüfen

### Update wird nicht installiert?

1. Service Worker vollständig geladen?
2. `ngsw.json` valide?
3. Neue Version deployed?
4. Cache-Control Headers richtig?

### Icons nicht angezeigt?

1. Pfade in manifest.webmanifest überprüfen
2. PNG-Dateien existieren?
3. Bildgrößen korrekt (192x192, 512x512)?

## 📚 Hilfreiche Links

- [Angular Service Worker Docs](https://angular.io/guide/service-worker-intro)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Manifest.webmanifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/de/docs/Web/API/Service_Worker_API)

---

**Status**: ✅ PWA vollständig implementiert
**Letzte Aktualisierung**: Februar 2026
