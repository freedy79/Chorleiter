const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
const db = require('../src/models');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    await db.piece.create({ id: 1, title: 'Teststück' });

    const emailService1 = require('../src/services/email.service');
    const { html, text } = await emailService1.buildPostEmail('**Hallo** {{1}}', 'Testchor');
    assert.ok(html.includes('<strong>Hallo</strong>'), 'Markdown not converted');
    assert.ok(html.includes('Testchor'), 'Choir name missing in html');
    assert.ok(html.includes('https://nak-chorleiter.de'), 'Link missing in html');
    assert.ok(html.includes('<a href="https://nak-chorleiter.de/pieces/1">Teststück</a>'), 'Piece link missing in html');
    assert.ok(text.includes('Testchor'), 'Choir name missing in text');
    assert.ok(text.includes('https://nak-chorleiter.de'), 'Link missing in text');
    assert.ok(text.includes('[Teststück](https://nak-chorleiter.de/pieces/1)'), 'Piece link missing in text');

    const emailTransporter = require('../src/services/emailTransporter');
    const originalSendMail = emailTransporter.sendMail;
    let capturedOptions = [];
    emailTransporter.sendMail = async (opts) => { capturedOptions.push(opts); };
    delete require.cache[require.resolve('../src/services/email.service')];
    const emailService2 = require('../src/services/email.service');
      await emailService2.sendPostNotificationMail(['user@example.com'], 'Titel', 'Text', 'Testchor', 'author@example.com');
      assert.strictEqual(capturedOptions.at(-1).replyTo, 'author@example.com', 'Reply-To not set correctly');

      // Test placeholder fallback when no name is provided
      capturedOptions = [];
      await db.mail_template.create({ type: 'invite', subject: '', body: 'Hallo {{first_name}} {{surname}}' });
      await emailService2.sendInvitationMail('tester@example.com', 'tok', 'Choir', new Date(), undefined, 'Invitor', undefined);
      assert.ok(capturedOptions.at(-1).html.includes('tester tester'), 'Fallback to email prefix failed');

      // Test that first_name does not fall back to surname when only surname is provided
      capturedOptions = [];
      await db.mail_template.create({ type: 'reset', subject: '', body: 'Hallo {{first_name}} {{surname}}' });
      await emailService2.sendPasswordResetMail('tester@example.com', 'tok', 'Nachname', undefined);
      assert.ok(capturedOptions.at(-1).html.includes('tester Nachname'), 'First name should fall back to email prefix, not surname');

      // Test that monthly plan templates get personalized placeholders per recipient
      capturedOptions = [];
      await db.mail_template.create({ type: 'monthly-plan', subject: 'Hallo {{first_name}}', body: '<p>{{surname}}</p>' });
      await emailService2.sendMonthlyPlanMail(['alice@example.com', 'bob@example.com'], Buffer.from('pdf'), 2024, 5, 'Choir');
      assert.strictEqual(capturedOptions.length, 2, 'Monthly plan should send one email per recipient');
      assert.ok(capturedOptions[0].subject.includes('alice'), 'First recipient first_name not replaced');
      assert.ok(capturedOptions[0].html.includes('alice'), 'First recipient surname fallback not replaced');
      assert.ok(capturedOptions[1].subject.includes('bob'), 'Second recipient first_name not replaced');
      assert.ok(capturedOptions[1].html.includes('bob'), 'Second recipient surname fallback not replaced');

      emailTransporter.sendMail = originalSendMail;

      console.log('email.service tests passed');
      await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
