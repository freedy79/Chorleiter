#!/usr/bin/env node
/**
 * PWA Icon Generator
 * Generiert alle PWA-Icons von der favicon.svg
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const faviconSvgPath = path.join(projectRoot, '..', 'favicon.svg');
const iconDir = path.join(projectRoot, 'public', 'assets', 'icons');

// Prüfe ob favicon.svg existiert
if (!fs.existsSync(faviconSvgPath)) {
  console.error('❌ favicon.svg nicht gefunden im Projektverzeichnis!');
  console.error(`   Erwartet: ${faviconSvgPath}`);
  process.exit(1);
}

// Erstelle Icon-Verzeichnis falls nicht vorhanden
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

console.log('🎨 Generiere PWA-Icons von favicon.svg...\n');

// Icon-Konfigurationen
const icons = [
  // Standard manifest icons
  { name: 'manifest-icon-192.png', size: 192, maskable: false },
  { name: 'manifest-icon-512.png', size: 512, maskable: false },

  // Maskable icons (mit 20% Safe Area)
  { name: 'manifest-icon-192.maskable.png', size: 192, maskable: true },
  { name: 'manifest-icon-512.maskable.png', size: 512, maskable: true },

  // Legacy/Compatibility icons
  { name: 'icon-96x96.png', size: 96, maskable: false },
  { name: 'icon-144x144.png', size: 144, maskable: false },
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-192x192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512x512-maskable.png', size: 512, maskable: true },

  // Apple Touch Icon
  { name: 'apple-icon-180.png', size: 180, maskable: false },

  // Favicon
  { name: 'favicon-196.png', size: 196, maskable: false },
];

/**
 * Generiert ein Icon mit oder ohne Safe Area für Maskable Icons
 */
async function generateIcon(config) {
  const outputPath = path.join(iconDir, config.name);

  try {
    let svgBuffer = fs.readFileSync(faviconSvgPath);

    if (config.maskable) {
      // Für maskable icons: SVG mit Padding erstellen (80% der Größe zentriert)
      const innerSize = Math.round(config.size * 0.8);
      const padding = Math.round((config.size - innerSize) / 2);

      // Lese die Original-SVG
      const originalSvg = fs.readFileSync(faviconSvgPath, 'utf8');

      // Extrahiere Fill-Color aus der SVG (für Hintergrund)
      const fillMatch = originalSvg.match(/fill:#([0-9a-fA-F]{6})/);
      const bgColor = fillMatch ? `#${fillMatch[1]}` : '#1976d2';

      // Erstelle neue SVG mit Safe Area
      const maskedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${config.size}" height="${config.size}" viewBox="0 0 ${config.size} ${config.size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${config.size}" height="${config.size}" fill="${bgColor}"/>
  <g transform="translate(${padding}, ${padding}) scale(${innerSize / 256})">
    ${originalSvg.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<svg[^>]*>|<\/svg>/g, '')}
  </g>
</svg>`;

      svgBuffer = Buffer.from(maskedSvg);
    }

    await sharp(svgBuffer)
      .resize(config.size, config.size)
      .png()
      .toFile(outputPath);

    const maskableLabel = config.maskable ? ' (maskable)' : '';
    console.log(`✓ ${config.name}${maskableLabel} - ${config.size}x${config.size}px`);
  } catch (err) {
    console.error(`✗ Fehler bei ${config.name}:`, err.message);
    throw err;
  }
}

// Favicon.ico generieren (multi-size ICO)
async function generateFavicon() {
  const faviconPath = path.join(projectRoot, 'public', 'favicon.ico');

  try {
    // Erstelle 32x32 PNG für favicon.ico
    const buffer = await sharp(faviconSvgPath)
      .resize(32, 32)
      .png()
      .toBuffer();

    // sharp kann kein ICO direkt erstellen, also speichern wir als PNG
    // Der Browser akzeptiert auch PNG als .ico
    await sharp(buffer).toFile(faviconPath);

    console.log(`✓ favicon.ico - 32x32px`);
  } catch (err) {
    console.error(`✗ Fehler bei favicon.ico:`, err.message);
  }
}

// Generiere alle Icons
async function generateAllIcons() {
  try {
    // Generiere alle definierten Icons
    for (const icon of icons) {
      await generateIcon(icon);
    }

    // Generiere favicon.ico
    await generateFavicon();

    console.log('\n✅ Alle PWA-Icons erfolgreich generiert!');
    console.log(`📁 Icons gespeichert in: ${iconDir}`);
    console.log(`📁 Favicon: ${path.join(projectRoot, 'public', 'favicon.ico')}`);

    // Zeige Zusammenfassung
    const generatedFiles = fs.readdirSync(iconDir).filter(f => f.endsWith('.png'));
    console.log(`\n📊 Insgesamt ${generatedFiles.length} Icons im assets/icons Verzeichnis`);
  } catch (err) {
    console.error('\n❌ Fehler beim Generieren der Icons:', err);
    process.exit(1);
  }
}

// Starte die Icon-Generierung
generateAllIcons();
