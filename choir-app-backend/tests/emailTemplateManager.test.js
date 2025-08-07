const assert = require('assert');
const { replacePlaceholders, buildTemplate } = require('../src/services/emailTemplateManager');

(async () => {
  try {
    const types = ['invite', 'reset', 'monthly-plan'];
    for (const type of types) {
      const template = `Hello {{surname}} {{link}} {{link-html}} {{${type}-link}} {{${type}-link-html}}`;
      const replaced = replacePlaceholders(template, type, { surname: 'Anna', link: 'http://example.com' });
      assert.ok(!replaced.includes('{{'), `Unreplaced placeholder for ${type}`);
      assert.ok(replaced.includes('<a href="http://example.com">http://example.com</a>'));
    }

    const mail = buildTemplate({ subject: 'Hi {{surname}}', body: '<p>Use {{link}}</p>' }, 'reset', { surname: 'Bob', link: 'http://example.com' });
    assert.strictEqual(mail.subject, 'Hi Bob');
    assert.strictEqual(mail.text.trim(), 'Use http://example.com');
    console.log('emailTemplateManager tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
