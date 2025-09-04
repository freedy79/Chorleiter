const assert = require('assert');
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
const db = require('../src/models');
const { buildPostEmail } = require('../src/services/email.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });
    await db.piece.create({ id: 1, title: 'Teststück' });
    const { html, text } = await buildPostEmail('**Hallo** {{1}}', 'Testchor');
    assert.ok(html.includes('<strong>Hallo</strong>'), 'Markdown not converted');
    assert.ok(html.includes('Testchor'), 'Choir name missing in html');
    assert.ok(html.includes('https://nak-chorleiter.de'), 'Link missing in html');
    assert.ok(html.includes('<a href="https://nak-chorleiter.de/pieces/1">Teststück</a>'), 'Piece link missing in html');
    assert.ok(text.includes('Testchor'), 'Choir name missing in text');
    assert.ok(text.includes('https://nak-chorleiter.de'), 'Link missing in text');
    assert.ok(text.includes('[Teststück](https://nak-chorleiter.de/pieces/1)'), 'Piece link missing in text');
    console.log('email.service tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();

