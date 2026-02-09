/**
 * Lighthouse Testing mit Authentifizierung
 * Startet einen einfachen Test-Server ohne Auth-Anforderung für Lighthouse
 */

import express from 'express';
import path from 'path';

const app = express();
const PORT = 8888;

// Whiteliste für Test-Routes die ohne Auth zugänglich sein sollen
app.use((req, res, next) => {
  // Erlauben Sie öffentliche Assets
  if (req.path.startsWith('/assets') ||
      req.path.startsWith('/styles') ||
      req.path === '/' ||
      req.path.match(/\.(html|css|js|json|svg|png|jpg|gif)$/)) {
    return next();
  }
  next();
});

// Serviere statische Dateien aus dist
const distPath = path.join(process.cwd(), 'dist', 'choir-app-frontend', 'browser');
app.use(express.static(distPath));

// SPA: Alle unbekannten Routen zum index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`📊 Test Server läuft auf http://localhost:${PORT}`);
  console.log(`🔍 Starte Lighthouse Audit...`);
  console.log(`   npx lighthouse http://localhost:${PORT} --view`);
});
