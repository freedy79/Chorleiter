/**
 * Doublette Detection Service
 * Detects duplicate/similar pieces in a choir's repertoire
 */

const db = require('../models');
const { groupDoublettes } = require('../utils/matching.utils');
const logger = require('../config/logger');

/**
 * Get similarity threshold from system settings
 * @param {number} default value if not configured
 * @returns {Promise<number>} - Threshold value (0-100)
 */
async function getSimilarityThreshold(defaultValue = 80) {
  try {
    const setting = await db.system_setting.findOne({
      where: { key: 'doublette_similarity_threshold' }
    });
    return setting ? parseInt(setting.value, 10) : defaultValue;
  } catch (error) {
    logger.warn(`Failed to retrieve similarity threshold: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Find all doublette candidates for a choir
 * Searches across all pieces in the choir's repertoire
 * @param {number} choirId - Choir ID
 * @param {Object} options - Options
 * @param {number} options.threshold - Similarity threshold (default: from settings)
 * @param {boolean} options.includeCollectionInfo - Include affected collections
 * @returns {Promise<Object[]>} - Array of doublette groups
 */
async function findDoublettesForChoir(choirId, options = {}) {
  try {
    logger.debug(`Finding doublettes for choir ${choirId}`);

    // Get all pieces for this choir with their composers
    const pieces = await db.piece.findAll({
      include: [
        {
          association: 'composers',
          through: { attributes: [] }
        }
      ]
    });

    if (pieces.length < 2) {
      logger.debug(`Choir ${choirId} has less than 2 pieces, no doublettes possible`);
      return [];
    }

    // Get threshold
    const threshold = options.threshold !== undefined
      ? options.threshold
      : await getSimilarityThreshold();

    logger.debug(`Using similarity threshold: ${threshold}%`);

    // Find doublettes
    const groups = groupDoublettes(pieces, threshold);

    // Optionally include collection information
    if (options.includeCollectionInfo && groups.length > 0) {
      for (const group of groups) {
        for (const candidate of group.candidates) {
          const collections = await db.collection.findAll({
            include: [{
              association: 'pieces',
              through: { attributes: [] },
              where: { id: candidate.id },
              required: true
            }]
          });
          candidate.collections = collections || [];
        }
      }
    }

    logger.info(`Found ${groups.length} doublette groups for choir ${choirId}`);
    return groups;

  } catch (error) {
    logger.error(`Error finding doublettes: ${error.message}`);
    throw error;
  }
}

/**
 * Find doublette candidates for a specific collection
 * @param {number} collectionId - Collection ID
 * @param {Object} options - Options
 * @param {number} options.threshold - Similarity threshold
 * @returns {Promise<Object[]>} - Array of doublette groups
 */
async function findDoublettesForCollection(collectionId, options = {}) {
  try {
    logger.debug(`Finding doublettes for collection ${collectionId}`);

    const collection = await db.collection.findByPk(collectionId, {
      include: [{
        association: 'pieces',
        through: { attributes: [] },
        include: [{ association: 'composers', through: { attributes: [] } }]
      }]
    });

    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    if (collection.pieces.length < 2) {
      logger.debug(`Collection has less than 2 pieces, no doublettes possible`);
      return [];
    }

    const threshold = options.threshold !== undefined
      ? options.threshold
      : await getSimilarityThreshold();

    const groups = groupDoublettes(collection.pieces, threshold);
    logger.info(`Found ${groups.length} doublette groups in collection ${collectionId}`);

    return groups;

  } catch (error) {
    logger.error(`Error finding doublettes in collection: ${error.message}`);
    throw error;
  }
}

/**
 * Get collections containing a specific piece
 * @param {number} pieceId - Piece ID
 * @returns {Promise<Object[]>} - Array of collections with piece count
 */
async function getAffectedCollections(pieceId) {
  try {
    logger.debug(`Getting collections containing piece ${pieceId}`);

    const collections = await db.collection.findAll({
      include: [{
        association: 'pieces',
        through: { attributes: [] },
        where: { id: pieceId },
        required: true
      }]
    });

    return collections.map(c => ({
      id: c.id,
      title: c.title,
      pieceCount: c.pieces.length
    }));

  } catch (error) {
    logger.error(`Error getting affected collections: ${error.message}`);
    throw error;
  }
}

/**
 * Set similarity threshold in system settings
 * @param {number} threshold - Threshold value (0-100)
 * @returns {Promise<void>}
 */
async function setSimilarityThreshold(threshold) {
  try {
    if (threshold < 0 || threshold > 100) {
      throw new Error('Threshold must be between 0 and 100');
    }

    await db.system_setting.upsert(
      {
        key: 'doublette_similarity_threshold',
        value: String(threshold),
        description: 'Similarity threshold for doublette detection (0-100)'
      },
      { where: { key: 'doublette_similarity_threshold' } }
    );

    logger.info(`Similarity threshold updated to ${threshold}%`);
  } catch (error) {
    logger.error(`Error setting threshold: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findDoublettesForChoir,
  findDoublettesForCollection,
  getAffectedCollections,
  getSimilarityThreshold,
  setSimilarityThreshold
};
