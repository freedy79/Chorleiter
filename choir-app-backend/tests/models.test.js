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

    checkFields(db.user, ['email', 'roles', 'lastDonation', 'preferences', 'street', 'postalCode', 'city', 'voice', 'shareWithChoir']);
    checkFields(db.choir, ['name', 'modules', 'joinHash']);
    checkFields(db.piece, ['title', 'durationSec']);
    checkFields(db.event, ['date', 'type', 'organistId', 'finalized', 'version', 'monthlyPlanId']);
    checkFields(db.monthly_plan, ['year', 'month', 'finalized', 'version']);
    checkFields(db.composer, ['name']);
    checkFields(db.publisher, ['name']);
    checkFields(db.category, ['name']);
    checkFields(db.collection, ['singleEdition', 'subtitle']);
    checkFields(db.collection_piece, ['numberInCollection']);
    checkFields(db.user_choir, ['rolesInChoir', 'registrationStatus']);
    checkFields(db.piece_change, ['data']);
    checkFields(db.repertoire_filter, ['name', 'data', 'visibility']);
    checkFields(db.mail_setting, ['host', 'port', 'user', 'pass', 'secure', 'starttls', 'fromAddress']);
    checkFields(db.plan_rule, ['dayOfWeek', 'weeks', 'notes']);
    checkFields(db.post, ['title', 'text', 'expiresAt', 'sendAsUser']);
    checkFields(db.program, ['title', 'description', 'status', 'startTime']);
    checkFields(db.program_element, ['type', 'position', 'duration']);
    checkFields(db.program_item, ['type', 'sortIndex']);

    // Basic association checks
    assert(db.user.associations.choirs, 'User should have choirs association');
    assert(db.piece.associations.composer, 'Piece should have composer association');
    assert(db.choir.associations.events, 'Choir should have events association');
    assert(db.choir.associations.monthlyPlans, 'Choir should have monthlyPlans association');
    assert(db.choir.associations.planRules, 'Choir should have planRules association');
    assert(db.choir.associations.programs, 'Choir should have programs association');
    assert(db.program.associations.items, 'Program should have items association');
    assert(db.program.associations.elements, 'Program should have elements association');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
