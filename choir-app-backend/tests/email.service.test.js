const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
const { buildPostEmail } = require('../src/services/email.service');

(async () => {
  try {
    const { html, text } = buildPostEmail('**Hallo** Welt', 'Testchor');
    assert.ok(html.includes('<strong>Hallo</strong> Welt'), 'Markdown not converted');
    assert.ok(html.includes('Testchor'), 'Choir name missing in html');
    assert.ok(html.includes('https://nak-chorleiter.de'), 'Link missing in html');
    assert.ok(text.includes('Testchor'), 'Choir name missing in text');
    assert.ok(text.includes('https://nak-chorleiter.de'), 'Link missing in text');
    console.log('email.service tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
