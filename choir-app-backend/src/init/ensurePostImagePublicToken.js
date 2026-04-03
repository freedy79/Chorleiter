/**
 * Migration: Add publicToken column to post_images table
 *
 * The post_images table was initially created without the publicToken column.
 * This migration adds it and populates existing rows with UUID values.
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../models');
const logger = require('../config/logger');

async function ensurePostImagePublicToken() {
  const qi = db.sequelize.getQueryInterface();
  try {
    const tableDescription = await qi.describeTable('post_images');

    // Column already exists — nothing to do
    if (tableDescription.publicToken) {
      logger.debug('[Migration] post_images.publicToken column already exists, skipping.');
      return;
    }

    logger.info('[Migration] Adding publicToken column to post_images table...');

    // Add column as nullable first (existing rows have no value yet)
    await qi.addColumn('post_images', 'publicToken', {
      type: db.Sequelize.UUID,
      allowNull: true,
      unique: true
    });

    // Populate existing rows with UUID values
    const [existingImages] = await db.sequelize.query('SELECT id FROM post_images');
    for (const image of existingImages) {
      await db.sequelize.query(
        'UPDATE post_images SET "publicToken" = :token WHERE id = :id',
        { replacements: { token: uuidv4(), id: image.id } }
      );
    }

    // Now make column NOT NULL
    await qi.changeColumn('post_images', 'publicToken', {
      type: db.Sequelize.UUID,
      allowNull: false,
      unique: true
    });

    logger.info(`[Migration] Added publicToken to post_images, populated ${existingImages.length} existing row(s).`);
  } catch (err) {
    if (err.message && err.message.includes('No description found')) {
      // Table doesn't exist yet — syncDatabase will create it with the column
      logger.debug('[Migration] post_images table does not exist yet, skipping publicToken migration.');
      return;
    }
    logger.error('[Migration] Error ensuring post_images.publicToken:', err);
    throw err;
  }
}

module.exports = { ensurePostImagePublicToken };
