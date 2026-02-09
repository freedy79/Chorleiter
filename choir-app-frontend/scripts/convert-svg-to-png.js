#!/usr/bin/env node
/**
 * SVG zu PNG Konverter für PWA Icons
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const iconDir = path.join(__dirname, '../public/assets/icons');

// Finde alle SVG-Dateien
const svgFiles = fs.readdirSync(iconDir).filter(f => f.endsWith('.svg'));

console.log(`Konvertiere ${svgFiles.length} SVG-Icons zu PNG...\n`);

const conversionPromises = svgFiles.map(svgFile => {
  const svgPath = path.join(iconDir, svgFile);
  const pngFile = svgFile.replace('.svg', '.png');
  const pngPath = path.join(iconDir, pngFile);

  return sharp(svgPath)
    .png()
    .toFile(pngPath)
    .then(() => {
      console.log(`✓ ${svgFile} → ${pngFile}`);
      // Entferne SVG nach erfolgreicher Konvertierung
      fs.unlinkSync(svgPath);
    })
    .catch(err => {
      console.error(`✗ Fehler bei ${svgFile}:`, err.message);
    });
});

Promise.all(conversionPromises).then(() => {
  console.log('\n✅ Alle Icons erfolgreich konvertiert!');
  console.log(`Icons Verzeichnis: ${iconDir}`);

  // Zeige verfügbare Icons
  const pngFiles = fs.readdirSync(iconDir).filter(f => f.endsWith('.png'));
  console.log(`\nVerfügbare PNG-Icons (${pngFiles.length}):`);
  pngFiles.forEach(f => console.log(`  - ${f}`));
}).catch(err => {
  console.error('Konvertierung fehlgeschlagen:', err);
  process.exit(1);
});
