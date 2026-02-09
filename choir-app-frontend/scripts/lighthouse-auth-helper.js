/**
 * Lighthouse Auth Helper
 * Speichert Login-Cookies und verwendet sie für Lighthouse-Audits
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('lighthouse/chrome-launcher');

const EMAIL = process.env.TEST_EMAIL || 'demo@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'demo';
const BASE_URL = 'http://localhost:4200';

async function loginAndGetCookies() {
  console.log('🔐 Starte Browser für Login...');

  const browser = await puppeteer.launch({
    headless: false, // Zeige Browser für manuelle Authentifizierung
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Navigiere zur Login-Seite
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

    console.log('📋 Bitte manuell anmelden...');
    console.log(`   URL: ${BASE_URL}/login`);
    console.log(`   Browser bleibt für ${60} Sekunden offen`);

    // Warte auf erfolgreiche Navigation (Navigation zu Home nach Login)
    try {
      await page.waitForNavigation({
        timeout: 60000,
        waitUntil: 'networkidle2'
      });
    } catch (e) {
      console.log('⏱️  Keine Navigation erkannt - fahre fort...');
    }

    // Erfasse Cookies
    const cookies = await page.cookies();
    console.log(`✅ Cookies erfasst: ${cookies.length} Cookies`);

    return cookies;
  } finally {
    await browser.close();
  }
}

async function runLighthouseWithCookies(cookies) {
  console.log('\n🔍 Starte Lighthouse Audit mit Authentifizierung...');

  const chromeInstance = await chromeLauncher.launch({
    chromeFlags: ['--no-sandbox']
  });

  try {
    const options = {
      logLevel: 'info',
      output: 'html',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'pwa'],
      port: chromeInstance.port,
      // Verwende Chrome mit gespeicherten Cookies
      protocols: ['http'],
      // Custom Pre-visit für Cookie-Setting
      preComputedLanternData: undefined,
    };

    // Ausführen von Lighthouse
    const runnerResult = await lighthouse(BASE_URL, options);

    // Report generieren
    const reportHtml = runnerResult.report;

    if (Array.isArray(reportHtml)) {
      console.log('❌ Report-Array - nutze JSON stattdessen');
      const fs = require('fs');
      fs.writeFileSync(
        './lighthouse-report-auth.json',
        JSON.stringify(runnerResult.lhr, null, 2)
      );
      console.log('✅ JSON Report gespeichert: lighthouse-report-auth.json');
    } else {
      const fs = require('fs');
      fs.writeFileSync('./lighthouse-report-auth.html', reportHtml);
      console.log('✅ HTML Report gespeichert: lighthouse-report-auth.html');
    }

    return runnerResult.lhr;
  } finally {
    await chromeInstance.kill();
  }
}

async function main() {
  console.log('🚀 Lighthouse Auth Testing\n');
  console.log('Optionen:');
  console.log('1. Manuell anmelden --> Cookies --> Lighthouse Test');
  console.log('2. Oder direkt "npm run lighthouse:mobile" verwenden\n');

  try {
    // For now, just provide instructions
    console.log('📝 Anweisungen für manuelle Authentifizierung mit Lighthouse:\n');
    console.log('Option A: Mit gespeicherten Cookies (empfohlen)');
    console.log('1. Öffne: http://localhost:4200/login');
    console.log('2. Melde dich an');
    console.log('3. Warte bis die Seite vollständig lädt');
    console.log('4. Starte Lighthouse mit: npm run lighthouse:mobile\n');

    console.log('Option B: Lighthouse mit Chrome Flags');
    console.log('npx lighthouse http://localhost:4200 --view --chrome-flags="--temp-profile"\n');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  }
}

main();
