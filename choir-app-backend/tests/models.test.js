const assert = require('assert');

// Set up in-memory SQLite for testing
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    function checkFields(model, fields) {
      const attrs = Object.keys(model.rawAttributes);
      for (const field of fields) {
        assert(attrs.includes(field), `${model.name} missing field ${field}`);
      }
    }

    checkFields(db.user, ['email', 'role', 'lastDonation']);
    checkFields(db.choir, ['name']);
    checkFields(db.piece, ['title']);
    checkFields(db.event, ['date', 'type']);
    checkFields(db.composer, ['name']);
    checkFields(db.category, ['name']);
    checkFields(db.collection, ['singleEdition']);
    checkFields(db.collection_piece, ['numberInCollection']);
    checkFields(db.user_choir, ['roleInChoir', 'registrationStatus']);
    checkFields(db.piece_change, ['data']);
    checkFields(db.repertoire_filter, ['name', 'data', 'visibility']);

    // Basic association checks
    assert(db.user.associations.choirs, 'User should have choirs association');
    assert(db.piece.associations.composer, 'Piece should have composer association');
    assert(db.choir.associations.events, 'Choir should have events association');

    console.log('All model tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
