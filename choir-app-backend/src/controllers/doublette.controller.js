/**
 * Doublette Controller
 * API endpoints for detecting and merging duplicate pieces
 */

const asyncHandler = require('express-async-handler');
const doubletteService = require('../services/doublette.service');
const mergeService = require('../services/merge.service');
const db = require('../models');
const logger = require('../config/logger');

/**
 * Check for doublettes in a choir's entire repertoire
 * POST /api/choirs/:choirId/pieces/check-doublettes
 */
exports.checkDoublettesForChoir = asyncHandler(async (req, res) => {
    const { choirId } = req.params;
    const { threshold } = req.query;

    logger.info(`Checking doublettes for choir ${choirId}`);

    const options = {};
    if (threshold !== undefined) {
        options.threshold = parseInt(threshold, 10);
    }
    options.includeCollectionInfo = true;

    const groups = await doubletteService.findDoublettesForChoir(choirId, options);

    res.status(200).send({
        choirId,
        totalGroups: groups.length,
        groups
    });
});

/**
 * Check for doublettes within a specific collection
 * GET /api/choirs/:choirId/collections/:collectionId/check-doublettes
 */
exports.checkDoublettesForCollection = asyncHandler(async (req, res) => {
    const { choirId, collectionId } = req.params;
    const { threshold } = req.query;

    logger.info(`Checking doublettes for collection ${collectionId} in choir ${choirId}`);

    const options = {};
    if (threshold !== undefined) {
        options.threshold = parseInt(threshold, 10);
    }

    const groups = await doubletteService.findDoublettesForCollection(collectionId, options);

    res.status(200).send({
        choirId,
        collectionId,
        totalGroups: groups.length,
        groups
    });
});

/**
 * Get collections containing a piece
 * GET /api/choirs/:choirId/pieces/:pieceId/collections
 */
exports.getPieceCollections = asyncHandler(async (req, res) => {
    const { pieceId } = req.params;

    logger.debug(`Getting collections for piece ${pieceId}`);

    const collections = await doubletteService.getAffectedCollections(pieceId);

    res.status(200).send({
        pieceId,
        collections
    });
});

/**
 * Merge two pieces
 * POST /api/choirs/:choirId/pieces/merge
 * Body: {
 *   sourceId: number (piece to delete),
 *   targetId: number (piece to keep),
 *   mergedMetadata: {
 *     composers: [{id, name, type}],
 *     categories: [{id, title}],
 *     durationSec: number,
 *     lyrics: string,
 *     sourceComposers: [],
 *     sourceCategories: []
 *   }
 * }
 */
exports.mergePieces = asyncHandler(async (req, res) => {
    const { choirId } = req.params;
    const { sourceId, targetId, mergedMetadata } = req.body;
    const userId = req.userId;

    logger.info(`Merging piece ${sourceId} into ${targetId} by user ${userId}`);

    // Validate request
    if (!sourceId || !targetId) {
        return res.status(400).send({
            message: 'sourceId and targetId are required'
        });
    }

    if (sourceId === targetId) {
        return res.status(400).send({
            message: 'Cannot merge a piece with itself'
        });
    }

    try {
        const result = await mergeService.mergePieces(
            sourceId,
            targetId,
            userId,
            choirId,
            mergedMetadata
        );

        res.status(200).send(result);
    } catch (err) {
        logger.error(`Merge failed: ${err.message}`);

        if (err.message.includes('not found')) {
            return res.status(404).send({
                message: 'One or both pieces not found',
                error: err.message
            });
        }

        res.status(400).send({
            message: 'Merge failed',
            error: err.message
        });
    }
});

/**
 * Get similarity threshold
 * GET /api/system/doublette-threshold
 */
exports.getThreshold = asyncHandler(async (req, res) => {
    const threshold = await doubletteService.getSimilarityThreshold();

    res.status(200).send({
        threshold
    });
});

/**
 * Update similarity threshold (admin only)
 * PUT /api/system/doublette-threshold
 * Body: { threshold: number (0-100) }
 */
exports.setThreshold = asyncHandler(async (req, res) => {
    const { threshold } = req.body;

    if (threshold === undefined) {
        return res.status(400).send({
            message: 'threshold is required'
        });
    }

    if (threshold < 0 || threshold > 100 || !Number.isInteger(threshold)) {
        return res.status(400).send({
            message: 'threshold must be an integer between 0 and 100'
        });
    }

    logger.info(`Updating doublette threshold to ${threshold}% by admin ${req.userId}`);

    await doubletteService.setSimilarityThreshold(threshold);

    res.status(200).send({
        message: 'Threshold updated successfully',
        threshold
    });
});

module.exports = exports;
