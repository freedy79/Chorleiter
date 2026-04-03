const asyncHandler = require('express-async-handler');
const db = require('../models');

/**
 * Get all markers for a given piece link (MP3).
 * GET /pieces/:id/links/:linkId/markers
 */
exports.getMarkers = asyncHandler(async (req, res) => {
    const { linkId } = req.params;

    const markers = await db.audio_marker.findAll({
        where: { pieceLinkId: linkId },
        order: [['timeSec', 'ASC']]
    });

    res.status(200).json(markers);
});

/**
 * Create a new marker for a piece link.
 * POST /pieces/:id/links/:linkId/markers
 */
exports.createMarker = asyncHandler(async (req, res) => {
    const { linkId } = req.params;
    const { timeSec, label } = req.body;

    if (timeSec == null || !label) {
        return res.status(400).json({ message: 'timeSec and label are required.' });
    }

    // Verify the piece link exists
    const link = await db.piece_link.findByPk(linkId);
    if (!link) {
        return res.status(404).json({ message: `PieceLink with id=${linkId} not found.` });
    }

    const marker = await db.audio_marker.create({
        pieceLinkId: Number(linkId),
        timeSec: Number(timeSec),
        label: String(label).trim()
    });

    res.status(201).json(marker);
});

/**
 * Update an existing marker.
 * PUT /pieces/:id/links/:linkId/markers/:markerId
 */
exports.updateMarker = asyncHandler(async (req, res) => {
    const { markerId } = req.params;
    const { timeSec, label } = req.body;

    const marker = await db.audio_marker.findByPk(markerId);
    if (!marker) {
        return res.status(404).json({ message: `Marker with id=${markerId} not found.` });
    }

    if (timeSec != null) marker.timeSec = Number(timeSec);
    if (label != null) marker.label = String(label).trim();

    await marker.save();
    res.status(200).json(marker);
});

/**
 * Delete a marker.
 * DELETE /pieces/:id/links/:linkId/markers/:markerId
 */
exports.deleteMarker = asyncHandler(async (req, res) => {
    const { markerId } = req.params;

    const marker = await db.audio_marker.findByPk(markerId);
    if (!marker) {
        return res.status(404).json({ message: `Marker with id=${markerId} not found.` });
    }

    await marker.destroy();
    res.status(200).json({ message: 'Marker deleted.' });
});
