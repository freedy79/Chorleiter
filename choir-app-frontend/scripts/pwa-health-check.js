#!/usr/bin/env node
/**
 * PWA Lighthouse Audit Helper
 * Führt automatische PWA-Prüfungen durch
 */

const fs = require('fs');
const path = require('path');

// Basis-Verzeichnis ist das Projekt-Root (nicht scripts/)
const projectRoot = path.join(__dirname, '..');

const checks = [
  {
    name: 'manifest.webmanifest vorhanden',
    check: () => fs.existsSync(path.join(projectRoot, 'public/manifest.webmanifest')),
    severity: 'error'
  },
  {
    name: 'ngsw-config.json vorhanden',
    check: () => fs.existsSync(path.join(projectRoot, 'ngsw-config.json')),
    severity: 'error'
  },
  {
    name: 'Service Worker Icons vorhanden (192x192)',
    check: () => fs.existsSync(path.join(projectRoot, 'public/assets/icons/icon-192x192.png')),
    severity: 'error'
  },
  {
    name: 'Service Worker Icons vorhanden (512x512)',
    check: () => fs.existsSync(path.join(projectRoot, 'public/assets/icons/icon-512x512.png')),
    severity: 'error'
  },
  {
    name: 'Update Service implementiert',
    check: () => fs.existsSync(path.join(projectRoot, 'src/app/services/service-worker-update.service.ts')),
    severity: 'error'
  },
  {
    name: 'PWA Update Notification Component',
    check: () => fs.existsSync(path.join(projectRoot, 'src/app/components/pwa-update-notification/pwa-update-notification.component.ts')),
    severity: 'error'
  },
  {
    name: 'Offline Indicator Component',
    check: () => fs.existsSync(path.join(projectRoot, 'src/app/components/offline-indicator/offline-indicator.component.ts')),
    severity: 'warning'
  },
  {
    name: 'PWA-Dokumentation vorhanden',
    check: () => fs.existsSync(path.join(projectRoot, 'PWA-FEATURES.md')),
    severity: 'warning'
  }
];

// Überprüfe Manifest-Inhalte
const checkManifestContent = () => {
  try {
    const manifestPath = path.join(projectRoot, 'public/manifest.webmanifest');
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color'];
    const missing = requiredFields.filter(f => !content[f]);

    if (missing.length > 0) {
      console.log(`⚠️  Manifest fehlen Felder: ${missing.join(', ')}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`❌ Fehler beim Parsen von manifest.webmanifest: ${err.message}`);
    return false;
  }
};

// Überprüfe ngsw-config.json
const checkNgswConfig = () => {
  try {
    const configPath = path.join(projectRoot, 'ngsw-config.json');
    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const requiredFields = ['index', 'assetGroups', 'dataGroups'];
    const missing = requiredFields.filter(f => !content[f]);

    if (missing.length > 0) {
      console.log(`⚠️  ngsw-config.json fehlen Felder: ${missing.join(', ')}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`❌ Fehler beim Parsen von ngsw-config.json: ${err.message}`);
    return false;
  }
};

// Überprüfe index.html
const checkIndexHtml = () => {
  try {
    const indexPath = path.join(projectRoot, 'src/index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    const checks = [
      { pattern: 'manifest.webmanifest', name: 'Manifest Link' },
      { pattern: 'theme-color', name: 'Theme Color Meta' },
      { pattern: 'apple-mobile-web-app-capable', name: 'Apple Mobile Web App Meta' }
    ];

    const missing = checks.filter(c => !content.includes(c.pattern));

    if (missing.length > 0) {
      console.log(`⚠️  index.html fehlen: ${missing.map(m => m.name).join(', ')}`);
      return false;
    }
    return true;
  } catch (err) {
    console.log(`❌ Fehler beim Überprüfen von index.html: ${err.message}`);
    return false;
  }
};

console.log('🔍 PWA Pre-Flight Checks\n');
console.log('═'.repeat(50));

let passedChecks = 0;
let failedChecks = 0;
let warningChecks = 0;

// Führe Standard-Checks aus
checks.forEach(check => {
  const result = check.check();
  const icon = result ? '✅' : (check.severity === 'error' ? '❌' : '⚠️ ');

  console.log(`${icon} ${check.name}`);

  if (result) {
    passedChecks++;
  } else if (check.severity === 'error') {
    failedChecks++;
  } else {
    warningChecks++;
  }
});

// Inhalts-Checks
console.log('\nInhalt-Überprüfung:');
console.log('─'.repeat(50));

const manifestOk = checkManifestContent();
const ngswOk = checkNgswConfig();
const indexOk = checkIndexHtml();

if (!manifestOk) failedChecks++;
else passedChecks++;

if (!ngswOk) failedChecks++;
else passedChecks++;

if (!indexOk) failedChecks++;
else passedChecks++;

console.log('\n' + '═'.repeat(50));
console.log(`\n📊 Ergebnisse:`);
console.log(`  ✅ Passed: ${passedChecks}`);
console.log(`  ⚠️  Warnings: ${warningChecks}`);
console.log(`  ❌ Failed: ${failedChecks}`);

if (failedChecks === 0) {
  console.log('\n🎉 Alle kritischen PWA-Checks bestanden!');
  console.log('\nNächste Schritte:');
  console.log('1. Führe einen Lighthouse Audit durch:');
  console.log('   - Öffne Chrome DevTools (F12)');
  console.log('   - Gehe zum Tab "Lighthouse"');
  console.log('   - Wähle "PWA" aus');
  console.log('   - Führe Audit durch');
  console.log('\n2. Teste Installation auf echtem Gerät');
  console.log('\n3. Teste Offline-Funktionalität');
  process.exit(0);
} else {
  console.log('\n⚠️  Behebe die fehlgeschlagenen Checks bevor du deployst!');
  process.exit(1);
}
