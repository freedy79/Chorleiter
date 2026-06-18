const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const db = require('../src/models');
const formService = require('../src/services/form.service');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const user = await db.user.create({
      firstName: 'Max',
      name: 'Mustermann',
      email: 'max.mustermann@example.com',
    });

    const form = await db.form.create({
      choirId: choir.id,
      title: 'Testformular',
      createdBy: user.id,
      status: 'published',
    });

    const field = await db.form_field.create({
      formId: form.id,
      type: 'text_short',
      label: 'Wie geht es dir?',
      sortOrder: 0,
      required: false,
    });

    await formService.submitForm(
      form.id,
      {
        answers: [{ fieldId: field.id, value: 'Gut' }],
      },
      user.id,
      '127.0.0.1',
      { hydrateResult: false }
    );

    const submissions = await formService.getSubmissions(form.id);

    assert.strictEqual(submissions.length, 1, 'Es sollte genau eine Abgabe geben');
    assert.ok(submissions[0].submitter, 'Abgabe sollte submitter enthalten');
    assert.strictEqual(submissions[0].submitter.firstName, 'Max', 'firstName sollte korrekt geladen werden');
    assert.strictEqual(submissions[0].submitter.lastName, 'Mustermann', 'name-Spalte sollte als lastName gemappt werden');

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
