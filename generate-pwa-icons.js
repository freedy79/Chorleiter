#!/usr/bin/env node
/**
 * PWA Icon Generator für NAK Chorleiter
 * Erstellt Icons als SVG und konvertiert sie zu PNG
 */

const fs = require('fs');
const path = require('path');

// Verzeichnis erstellen
const iconDir = path.join(__dirname, 'choir-app-frontend/public/assets/icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Basis SVG Template für Icon
const createIconSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Hintergrund -->
  <rect width="${size}" height="${size}" fill="white"/>

  <!-- Blauer Kreis -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="#1976d2"/>

  <!-- Musiknoten -->
  <g transform="translate(${size*0.3}, ${size*0.25})">
    <!-- Erste Note (Ellipse) -->
    <ellipse cx="0" cy="${size*0.2}" rx="${size*0.08}" ry="${size*0.1}" fill="white" transform="rotate(-20)"/>
    <!-- Stiel erste Note -->
    <line x1="${size*0.08}" y1="0" x2="${size*0.08}" y2="${size*0.25}" stroke="white" stroke-width="${size*0.04}" stroke-linecap="round"/>

    <!-- Zweite Note (Ellipse) -->
    <ellipse cx="${size*0.25}" cy="${size*0.1}" rx="${size*0.08}" ry="${size*0.1}" fill="white" transform="rotate(-20)"/>
    <!-- Stiel zweite Note -->
    <line x1="${size*0.33}" y1="-0.1" x2="${size*0.33}" y2="${size*0.15}" stroke="white" stroke-width="${size*0.04}" stroke-linecap="round"/>

    <!-- Balken -->
    <path d="M ${size*0.08} 0 Q ${size*0.2} -${size*0.05} ${size*0.33} -0.1" stroke="white" stroke-width="${size*0.03}" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

// Maskable Icon SVG
const createMaskableIconSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Blauer Kreis für maskable (kein weißer Hintergrund) -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#1976d2"/>

  <!-- Musiknoten in größer -->
  <g transform="translate(${size*0.25}, ${size*0.2})">
    <!-- Erste Note (Ellipse) -->
    <ellipse cx="0" cy="${size*0.25}" rx="${size*0.1}" ry="${size*0.12}" fill="white" transform="rotate(-20)"/>
    <!-- Stiel erste Note -->
    <line x1="${size*0.1}" y1="0" x2="${size*0.1}" y2="${size*0.3}" stroke="white" stroke-width="${size*0.05}" stroke-linecap="round"/>

    <!-- Zweite Note (Ellipse) -->
    <ellipse cx="${size*0.3}" cy="${size*0.12}" rx="${size*0.1}" ry="${size*0.12}" fill="white" transform="rotate(-20)"/>
    <!-- Stiel zweite Note -->
    <line x1="${size*0.4}" y1="-0.15" x2="${size*0.4}" y2="${size*0.2}" stroke="white" stroke-width="${size*0.05}" stroke-linecap="round"/>

    <!-- Balken -->
    <path d="M ${size*0.1} 0 Q ${size*0.25} -${size*0.06} ${size*0.4} -0.15" stroke="white" stroke-width="${size*0.04}" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

// Shortcut Icons
const createShortcutIconSVG = (size, bgColor, symbol) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="#1976d2"/>
  <text x="${size/2}" y="${size/2}" font-size="${size*0.35}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${symbol}</text>
</svg>`;

// Screenshot Template
const createScreenshotSVG = (width, height) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Weiß Hintergrund -->
  <rect width="${width}" height="${height}" fill="white"/>

  <!-- Header mit Blau -->
  <rect width="${width}" height="${height*0.1}" fill="#1976d2"/>
  <text x="${width/2}" y="${height*0.08}" font-size="${height*0.06}" fill="white" text-anchor="middle" font-weight="bold">NAK Chorleiter</text>

  <!-- Content Platzhalter -->
  <rect x="${width*0.05}" y="${height*0.15}" width="${width*0.9}" height="${height*0.08}" fill="#f5f5f5" rx="4"/>
  <rect x="${width*0.05}" y="${height*0.28}" width="${width*0.9}" height="${height*0.08}" fill="#f5f5f5" rx="4"/>
  <rect x="${width*0.05}" y="${height*0.41}" width="${width*0.9}" height="${height*0.08}" fill="#f5f5f5" rx="4"/>

  <!-- Footer Navigation -->
  <rect y="${height*0.9}" width="${width}" height="${height*0.1}" fill="#f5f5f5"/>
  <circle cx="${width*0.2}" cy="${height*0.95}" r="${height*0.03}" fill="#1976d2"/>
  <circle cx="${width*0.5}" cy="${height*0.95}" r="${height*0.03}" fill="#d0d0d0"/>
  <circle cx="${width*0.8}" cy="${height*0.95}" r="${height*0.03}" fill="#d0d0d0"/>
</svg>`;

// Erstelle Icons
const icons = [
  { size: 96, filename: 'icon-96x96.png', type: 'default' },
  { size: 144, filename: 'icon-144x144.png', type: 'default' },
  { size: 192, filename: 'icon-192x192.png', type: 'default' },
  { size: 192, filename: 'icon-192x192-maskable.png', type: 'maskable' },
  { size: 512, filename: 'icon-512x512.png', type: 'default' },
  { size: 512, filename: 'icon-512x512-maskable.png', type: 'maskable' },
];

const shortcuts = [
  { size: 192, filename: 'shortcut-absence-192x192.png', bgColor: '#e8f5e9', symbol: 'A' },
  { size: 192, filename: 'shortcut-library-192x192.png', bgColor: '#e3f2fd', symbol: 'L' },
  { size: 192, filename: 'shortcut-performance-192x192.png', bgColor: '#fff3e0', symbol: 'E' },
];

// SVG-Dateien speichern (werden später zu PNG konvertiert)
console.log('Generiere SVG-Icons...\n');

icons.forEach(icon => {
  const svg = icon.type === 'maskable'
    ? createMaskableIconSVG(icon.size)
    : createIconSVG(icon.size);

  const svgPath = path.join(iconDir, icon.filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ ${icon.filename}`);
});

console.log('\nGeneriere Shortcut-Icons...\n');

shortcuts.forEach(shortcut => {
  const svg = createShortcutIconSVG(shortcut.size, shortcut.bgColor, shortcut.symbol);
  const svgPath = path.join(iconDir, shortcut.filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ ${shortcut.filename}`);
});

console.log('\nGeneriere Screenshots...\n');

const screenshots = [
  { width: 540, height: 720, filename: 'screenshot-1.png' },
  { width: 1280, height: 720, filename: 'screenshot-2.png' },
];

screenshots.forEach(ss => {
  const svg = createScreenshotSVG(ss.width, ss.height);
  const svgPath = path.join(iconDir, ss.filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ ${ss.filename}`);
});

console.log('\n✅ SVG-Icons erfolgreich erstellt!');
console.log('Hinweis: Konvertiere SVG zu PNG mit: convert *.svg *.png');
console.log('Oder nutze ImageMagick oder einen Online-Konverter.');
console.log('\nIcon-Verzeichnis:', iconDir);
