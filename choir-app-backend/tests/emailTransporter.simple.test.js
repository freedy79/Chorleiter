/**
 * Simplified test for email validation
 */

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'false';
process.env.NODE_ENV = 'test';

const db = require('../src/models');

// Mock nodemailer before requiring emailTransporter
const nodemailer = require('nodemailer');
let sentEmails = [];
nodemailer.createTransport = function() {
  return {
    sendMail: async function(options) {
      sentEmails.push(options);
      return { messageId: 'test-' + sentEmails.length };
    }
  };
};

const emailTransporter = require('../src/services/emailTransporter');

async function setup() {
  await db.sequelize.sync({ force: true, logging: false });

  await db.user.create({
    email: 'admin@test.de',
    name: 'Admin',
    firstName: 'Test',
    password: 'test123',
    roles: ['admin']
  });

  await db.mail_setting.create({
    id: 1,
    host: 'smtp.test.de',
    port: 587,
    user: 'test@test.de',
    pass: 'testpass',
    fromAddress: 'noreply@test.de'
  });
}

async function test1() {
  console.log('\n=== Test 1: Leere E-Mail wird verhindert ===');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: '',
    text: ''
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  if (sentEmails.length === 1 && sentEmails[0].subject.includes('Leere E-Mail')) {
    console.log('✓ ERFOLG: Admin wurde benachrichtigt');
    console.log('  Betreff:', sentEmails[0].subject);
    return true;
  } else {
    console.log('✗ FEHLER: Erwartete Admin-Benachrichtigung nicht erhalten');
    console.log('  Gesendete E-Mails:', sentEmails.length);
    return false;
  }
}

async function test2() {
  console.log('\n=== Test 2: Valide E-Mail wird gesendet ===');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: 'Test Betreff',
    text: 'Test Inhalt'
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  if (sentEmails.length === 1 && sentEmails[0].to === 'user@test.de') {
    console.log('✓ ERFOLG: E-Mail wurde gesendet');
    return true;
  } else {
    console.log('✗ FEHLER: E-Mail wurde nicht gesendet');
    return false;
  }
}

async function test3() {
  console.log('\n=== Test 3: E-Mail ohne Betreff wird verhindert ===');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: '',
    text: 'Ich habe Inhalt'
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  if (sentEmails.length === 1 && sentEmails[0].subject.includes('Leere E-Mail')) {
    console.log('✓ ERFOLG: Admin wurde über fehlenden Betreff benachrichtigt');
    return true;
  } else {
    console.log('✗ FEHLER: Keine Admin-Benachrichtigung');
    return false;
  }
}

async function runTests() {
  console.log('\n==================================');
  console.log('Email Validation Tests (Simplified)');
  console.log('==================================');

  try {
    await setup();

    const results = [];
    results.push(await test1());
    results.push(await test2());
    results.push(await test3());

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n==================================');
    console.log(`Ergebnis: ${passed}/${total} Tests erfolgreich`);
    console.log('==================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('\n✗ Fehler:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

runTests();
