const assert = require('assert');
const { replacePlaceholders, buildTemplate } = require('../src/services/emailTemplateManager');

(async () => {
  try {
    const types = ['invite', 'reset', 'monthly-plan'];
    for (const type of types) {
      const template = `Hello {{first_name}} {{surname}} {{link}} {{link-html}} {{${type}-link}} {{${type}-link-html}}`;
      const replaced = replacePlaceholders(template, type, { first_name: 'Anna', surname: 'Smith', link: 'http://example.com' });
      assert.ok(!replaced.includes('{{'), `Unreplaced placeholder for ${type}`);
      assert.ok(replaced.includes('<a href="http://example.com">http://example.com</a>'));
    }

    const mail = buildTemplate({ subject: 'Hi {{first_name}}', body: '<p>Use {{link}}</p>' }, 'reset', { first_name: 'Bob', link: 'http://example.com' });
    assert.strictEqual(mail.subject, 'Hi Bob');
    assert.strictEqual(mail.text.trim(), 'Use http://example.com');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
