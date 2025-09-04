const db = require('../models');
const logger = require('../config/logger');

async function fixProgramPublishedFromIdColumn() {
  const queryInterface = db.sequelize.getQueryInterface();
  try {
    const table = await queryInterface.describeTable('programs');
    if (table.published_from_id && table.published_from_id.type !== 'UUID') {
      logger.info('Converting programs.published_from_id column to UUID');
      await db.sequelize.transaction(async (transaction) => {
        await db.sequelize.query('ALTER TABLE "programs" ALTER COLUMN "published_from_id" DROP NOT NULL', { transaction });
        await db.sequelize.query('ALTER TABLE "programs" ALTER COLUMN "published_from_id" DROP DEFAULT', { transaction });
        await db.sequelize.query('UPDATE "programs" SET "published_from_id" = NULL', { transaction });
        await db.sequelize.query(
          'ALTER TABLE "programs" ALTER COLUMN "published_from_id" TYPE UUID USING CAST(NULL AS UUID)',
          { transaction }
        );
      });
    }
  } catch (error) {
    // Ignore error if programs table does not exist yet
    if (error.name === 'SequelizeDatabaseError' && /does not exist|no such table/i.test(error.message)) {
      logger.debug('Programs table does not exist, skipping published_from_id migration');
      return;
    }
    throw error;
  }
}

module.exports = { fixProgramPublishedFromIdColumn };
