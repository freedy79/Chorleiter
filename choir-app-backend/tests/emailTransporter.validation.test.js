/**
 * Test for email validation in emailTransporter
 *
 * This test verifies that:
 * 1. Emails without subject or body are blocked
 * 2. Admins are notified when empty emails are prevented
 * 3. Valid emails are sent normally
 */

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.DISABLE_EMAIL = 'false'; // Enable email for testing

const assert = require('assert');
const db = require('../src/models');
const emailTransporter = require('../src/services/emailTransporter');

// Store original sendMail to restore later
let originalSendMail;
let sentEmails = [];

async function setup() {
  await db.sequelize.sync({ force: true });

  // Create test admin user
  await db.user.create({
    email: 'admin@test.de',
    name: 'Admin',
    firstName: 'Test',
    password: 'test123',
    roles: ['admin']
  });

  // Create mail settings
  await db.mail_setting.create({
    id: 1,
    host: 'smtp.test.de',
    port: 587,
    user: 'test@test.de',
    pass: 'testpass',
    fromAddress: 'noreply@test.de'
  });
}

async function teardown() {
  sentEmails = [];
  await db.sequelize.close();
}

// Mock nodemailer
const nodemailer = require('nodemailer');
const originalCreateTransport = nodemailer.createTransport;
nodemailer.createTransport = function() {
  return {
    sendMail: async function(options) {
      sentEmails.push(options);
      return { messageId: 'test-' + sentEmails.length };
    }
  };
};

async function testEmptySubjectAndBody() {
  console.log('\nTest: E-Mail ohne Betreff und Body wird verhindert');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: '',
    text: '',
    html: ''
  });

  // Wait a bit for async admin notification
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check that admin was notified
  assert.strictEqual(sentEmails.length, 1, 'Admin sollte benachrichtigt werden');
  assert.ok(sentEmails[0].subject.includes('Leere E-Mail wurde verhindert'),
    'Admin-Mail sollte Warnung enthalten');
  assert.ok(sentEmails[0].to.includes('admin@test.de'),
    'Admin sollte Empfänger sein');
  assert.ok(sentEmails[0].html.includes('Kein Betreff und kein Bodytext vorhanden'),
    'Grund sollte erwähnt werden');
  assert.ok(sentEmails[0].html.includes('user@test.de'),
    'Ursprünglicher Empfänger sollte erwähnt werden');

  console.log('✓ E-Mail wurde verhindert und Admin benachrichtigt');
}

async function testEmptySubject() {
  console.log('\nTest: E-Mail ohne Betreff wird verhindert');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: '',
    text: 'Dies ist ein Test',
    html: '<p>Dies ist ein Test</p>'
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(sentEmails.length, 1, 'Admin sollte benachrichtigt werden');
  assert.ok(sentEmails[0].html.includes('Kein Betreff vorhanden'),
    'Grund sollte "Kein Betreff" sein');

  console.log('✓ E-Mail ohne Betreff wurde verhindert');
}

async function testEmptyBody() {
  console.log('\nTest: E-Mail ohne Body wird verhindert');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: 'Test Betreff',
    text: '',
    html: '<p></p>'
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(sentEmails.length, 1, 'Admin sollte benachrichtigt werden');
  assert.ok(sentEmails[0].html.includes('Kein Bodytext vorhanden'),
    'Grund sollte "Kein Bodytext" sein');

  console.log('✓ E-Mail ohne Bodytext wurde verhindert');
}

async function testEmptyBodyOnlyWhitespace() {
  console.log('\nTest: E-Mail mit nur Whitespace im Body wird verhindert');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: 'Test Betreff',
    text: '   \n  \t  ',
    html: '<p>   </p><br><div></div>'
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(sentEmails.length, 1, 'Admin sollte benachrichtigt werden');
  assert.ok(sentEmails[0].html.includes('Kein Bodytext vorhanden'),
    'Whitespace sollte als leer erkannt werden');

  console.log('✓ E-Mail mit nur Whitespace wurde verhindert');
}

async function testValidEmail() {
  console.log('\nTest: Valide E-Mail wird gesendet');
  sentEmails = [];

  await emailTransporter.sendMail({
    to: 'user@test.de',
    subject: 'Test Betreff',
    text: 'Dies ist ein Testtext',
    html: '<p>Dies ist ein Testtext</p>'
  });

  // No admin notification should be sent, only the actual email
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(sentEmails.length, 1, 'Genau eine E-Mail sollte gesendet werden');
  assert.strictEqual(sentEmails[0].to, 'user@test.de', 'Empfänger sollte korrekt sein');
  assert.strictEqual(sentEmails[0].subject, 'Test Betreff', 'Betreff sollte korrekt sein');

  console.log('✓ Valide E-Mail wurde gesendet');
}

async function testStackTraceInNotification() {
  console.log('\nTest: Stack Trace wird in Admin-Benachrichtigung inkludiert');
  sentEmails = [];

  // Call from a named function to check if it appears in stack trace
  async function testFunction() {
    await emailTransporter.sendMail({
      to: 'user@test.de',
      subject: '',
      text: ''
    });
  }

  await testFunction();
  await new Promise(resolve => setTimeout(resolve, 100));

  assert.strictEqual(sentEmails.length, 1, 'Admin sollte benachrichtigt werden');
  assert.ok(sentEmails[0].html.includes('Stack Trace'),
    'Stack Trace sollte enthalten sein');

  console.log('✓ Stack Trace ist in Admin-Benachrichtigung enthalten');
}

async function runTests() {
  console.log('=== Email Validation Tests ===');

  try {
    await setup();

    await testEmptySubjectAndBody();
    await testEmptySubject();
    await testEmptyBody();
    await testEmptyBodyOnlyWhitespace();
    await testValidEmail();
    await testStackTraceInNotification();

    console.log('\n✓ Alle Tests erfolgreich!');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Test fehlgeschlagen:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await teardown();
  }
}

runTests();
