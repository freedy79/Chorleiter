#!/usr/bin/env node

/**
 * CLI-Skript zur Generierung von VAPID-Schlüsseln für Web Push Notifications.
 *
 * Verwendung:
 *   node scripts/generate-vapid-keys.js              # Schlüssel nur anzeigen
 *   node scripts/generate-vapid-keys.js --save       # Schlüssel in .env speichern
 *   node scripts/generate-vapid-keys.js --save --subject mailto:admin@example.com
 *
 * Die generierten Schlüssel werden für die Web Push API (VAPID) benötigt,
 * damit der Server Push-Benachrichtigungen an Browser senden kann.
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const shouldSave = args.includes('--save');
const subjectIndex = args.indexOf('--subject');
const subject = subjectIndex !== -1 && args[subjectIndex + 1]
  ? args[subjectIndex + 1]
  : null;

console.log('\n========================================');
console.log('  VAPID-Schlüssel Generator');
console.log('  (Web Push Notifications)');
console.log('========================================\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Öffentlicher Schlüssel (Public Key):');
console.log(`  ${vapidKeys.publicKey}\n`);

console.log('Privater Schlüssel (Private Key):');
console.log(`  ${vapidKeys.privateKey}\n`);

if (shouldSave) {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    console.error('Fehler: .env-Datei nicht gefunden unter:', envPath);
    console.log('Bitte erstellen Sie zuerst eine .env-Datei basierend auf .env.example\n');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace or append VAPID_PUBLIC_KEY
  if (envContent.match(/^VAPID_PUBLIC_KEY=.*/m)) {
    envContent = envContent.replace(/^VAPID_PUBLIC_KEY=.*/m, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  } else {
    envContent += `\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;
  }

  // Replace or append VAPID_PRIVATE_KEY
  if (envContent.match(/^VAPID_PRIVATE_KEY=.*/m)) {
    envContent = envContent.replace(/^VAPID_PRIVATE_KEY=.*/m, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  } else {
    envContent += `\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
  }

  // Replace or append VAPID_SUBJECT if provided
  if (subject) {
    if (envContent.match(/^VAPID_SUBJECT=.*/m)) {
      envContent = envContent.replace(/^VAPID_SUBJECT=.*/m, `VAPID_SUBJECT=${subject}`);
    } else {
      envContent += `\nVAPID_SUBJECT=${subject}`;
    }
  }

  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✓ Schlüssel wurden in .env gespeichert.');
  if (subject) {
    console.log(`✓ Subject gesetzt: ${subject}`);
  }
  console.log('\nHinweis: Der Backend-Server muss neu gestartet werden,');
  console.log('damit die neuen Schlüssel aktiv werden.\n');
} else {
  console.log('Fügen Sie diese Werte in Ihre .env-Datei ein:');
  console.log('');
  console.log(`  VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`  VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  if (subject) {
    console.log(`  VAPID_SUBJECT=${subject}`);
  } else {
    console.log('  VAPID_SUBJECT=mailto:your_email@example.com');
  }
  console.log('');
  console.log('Oder verwenden Sie --save um automatisch in .env zu speichern:');
  console.log('  node scripts/generate-vapid-keys.js --save\n');
}
