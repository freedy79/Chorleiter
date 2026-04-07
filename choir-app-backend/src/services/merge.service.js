/**
 * Piece Merge Service
 * Handles merging duplicate pieces and updating collection references
 */

const db = require('../models');
const logger = require('../config/logger');

/**
 * Merge two pieces atomically
 * Keeps the target piece, deletes the source piece
 * Updates all collection references to point to target
 * Creates audit log entry
 *
 * @param {number} sourceId - Piece to delete
 * @param {number} targetId - Piece to keep
 * @param {number} userId - Admin user performing merge
 * @param {number} choirId - Choir context
 * @param {Object} mergedMetadata - Metadata from both pieces to keep
 * @param {Object[]} mergedMetadata.composers - Final list of composers
 * @param {Object[]} mergedMetadata.categories - Final list of categories
 * @returns {Promise<Object>} - Merge result with affectedCollections count
 */
async function mergePieces(sourceId, targetId, userId, choirId, mergedMetadata = {}) {
  const transaction = await db.sequelize.transaction();

  try {
    logger.info(`Starting merge: piece ${sourceId} → ${targetId}`);

    // 1. Validate pieces exist and are different
    const sourcePiece = await db.piece.findByPk(sourceId, { transaction });
    const targetPiece = await db.piece.findByPk(targetId, { transaction });

    if (!sourcePiece || !targetPiece) {
      throw new Error('One or both pieces not found');
    }

    if (sourceId === targetId) {
      throw new Error('Cannot merge a piece with itself');
    }

    // 2. Get all collections containing the source piece
    const affectedCollections = await db.collection_piece.findAll({
      where: { pieceId: sourceId },
      transaction
    });

    logger.debug(`Found ${affectedCollections.length} collection references to update`);

    // 3. Update all collection_piece records pointing to source → target
    for (const collPiece of affectedCollections) {
      // Check if target already exists in this collection
      const existingInCollection = await db.collection_piece.findOne({
        where: {
          collectionId: collPiece.collectionId,
          pieceId: targetId
        },
        transaction
      });

      if (existingInCollection) {
        // Target already in collection, just remove the source reference
        logger.debug(`Collection ${collPiece.collectionId} already contains target, removing source`);
        await collPiece.destroy({ transaction });
      } else {
        // Update source reference to target
        await collPiece.update(
          { pieceId: targetId },
          { transaction }
        );
        logger.debug(`Updated collection ${collPiece.collectionId} reference to target piece`);
      }
    }

    // 4. Merge composers if specified
    if (mergedMetadata.composers && mergedMetadata.composers.length > 0) {
      // Remove existing composers from target
      await db.piece_composer.destroy({
        where: { pieceId: targetId },
        transaction
      });

      // Add merged composers
      const composerEntries = mergedMetadata.composers.map(c => ({
        pieceId: targetId,
        composerId: c.id || c.composer_id,
        type: c.type || null
      }));

      await db.piece_composer.bulkCreate(composerEntries, { transaction });
      logger.debug(`Merged ${mergedMetadata.composers.length} composers into target`);
    }

    // 5. Merge categories if specified
    if (mergedMetadata.categories && mergedMetadata.categories.length > 0) {
      // Get existing categories on target
      const existingCategories = await db.sequelize.query(
        'SELECT categoryId FROM piece_categories WHERE pieceId = ?',
        {
          replacements: [targetId],
          type: db.Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      const existingIds = existingCategories.map(c => c.categoryId);
      const newCategories = mergedMetadata.categories.filter(
        c => !existingIds.includes(c.id || c.category_id)
      );

      // Add only new categories
      if (newCategories.length > 0) {
        await db.sequelize.query(
          'INSERT INTO piece_categories (pieceId, categoryId) VALUES ' +
          newCategories.map(() => `(?, ?)`).join(','),
          {
            replacements: newCategories.flatMap(c => [
              targetId,
              c.id || c.category_id
            ]),
            transaction
          }
        );
        logger.debug(`Added ${newCategories.length} categories to target`);
      }
    }

    // 6. Update other metadata on target if specified
    const updateData = {};
    if (mergedMetadata.durationSec && !targetPiece.durationSec) {
      updateData.durationSec = mergedMetadata.durationSec;
    }
    if (mergedMetadata.lyrics && !targetPiece.lyrics) {
      updateData.lyrics = mergedMetadata.lyrics;
    }

    if (Object.keys(updateData).length > 0) {
      await targetPiece.update(updateData, { transaction });
      logger.debug(`Updated target piece metadata`, updateData);
    }

    // 7. Store source piece data for audit
    const sourceSnapshot = {
      id: sourcePiece.id,
      title: sourcePiece.title,
      composers: mergedMetadata.sourceComposers || [],
      categories: mergedMetadata.sourceCategories || [],
      durationSec: sourcePiece.durationSec
    };

    // 8. Create audit log entry
    await db.piece_audit_log.create({
      pieceId: sourceId,
      choirId: choirId,
      action: 'MERGED',
      sourceId: sourceId,
      targetId: targetId,
      userId: userId,
      metadata: sourceSnapshot
    }, { transaction });

    logger.debug(`Created audit log for merge`);

    // 9. Delete source piece
    await sourcePiece.destroy({ transaction });
    logger.debug(`Deleted source piece ${sourceId}`);

    // 10. Commit transaction
    await transaction.commit();

    logger.info(`Successfully merged piece ${sourceId} into ${targetId}`);

    return {
      message: 'Pieces merged successfully',
      mergedPiece: targetPiece,
      affectedCollectionsCount: affectedCollections.length
    };

  } catch (error) {
    await transaction.rollback();
    logger.error(`Merge failed: ${error.message}`);
    throw error;
  }
}

/**
 * Validate that a piece can be deleted
 * Check if it's referenced in any collections
 * @param {number} pieceId - Piece to check
 * @returns {Promise<Object>} - { canDelete: boolean, collections: [] }
 */
async function validatePieceDelete(pieceId) {
  try {
    const collectionPieces = await db.collection_piece.findAll({
      where: { pieceId },
      attributes: ['collectionId']
    });

    if (collectionPieces.length === 0) {
      return { canDelete: true, affectedCollections: [] };
    }

    const collectionIds = collectionPieces.map(cp => cp.collectionId);
    const collections = await db.collection.findAll({
      where: { id: collectionIds },
      attributes: ['id', 'title']
    });

    return {
      canDelete: false,
      affectedCollections: collections.map(c => ({
        id: c.id,
        title: c.title
      }))
    };
  } catch (error) {
    logger.error(`Error validating piece delete: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a piece with audit log
 * Should only be called after validating no collection references exist
 * @param {number} pieceId - Piece to delete
 * @param {number} userId - Admin user performing delete
 * @param {number} choirId - Choir context
 * @returns {Promise<Object>} - Deletion result
 */
async function deletePieceWithAudit(pieceId, userId, choirId) {
  const transaction = await db.sequelize.transaction();

  try {
    logger.info(`Starting deletion of piece ${pieceId}`);

    // 1. Validate no collection references
    const validation = await validatePieceDelete(pieceId);
    if (!validation.canDelete) {
      throw new Error(`Piece is still referenced in ${validation.affectedCollections.length} collection(s)`);
    }

    // 2. Get piece data for audit
    const piece = await db.piece.findByPk(pieceId, {
      include: [{ association: 'composers', through: { attributes: [] } }],
      transaction
    });

    if (!piece) {
      throw new Error('Piece not found');
    }

    const snapshot = {
      id: piece.id,
      title: piece.title,
      composers: piece.composers.map(c => ({ id: c.id, name: c.name })),
      durationSec: piece.durationSec
    };

    // 3. Create audit log
    await db.piece_audit_log.create({
      pieceId: pieceId,
      choirId: choirId,
      action: 'DELETED',
      userId: userId,
      metadata: snapshot
    }, { transaction });

    logger.debug(`Created audit log for deletion`);

    // 4. Delete piece
    await piece.destroy({ transaction });
    logger.debug(`Deleted piece ${pieceId}`);

    // 5. Commit
    await transaction.commit();

    logger.info(`Successfully deleted piece ${pieceId}`);

    return {
      message: 'Piece deleted successfully',
      pieceId: pieceId
    };

  } catch (error) {
    await transaction.rollback();
    logger.error(`Piece deletion failed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  mergePieces,
  validatePieceDelete,
  deletePieceWithAudit
};
