const db = require("../models");
const Piece = db.piece;
const Composer = db.composer;
const Category = db.category;
const Author = db.author;
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const fileService = require('../services/file.service');
const pieceService = require('../services/piece.service');
const mergeService = require('../services/merge.service');
const asyncHandler = require('express-async-handler');
const BaseCrudController = require('./baseCrud.controller');
const base = new BaseCrudController(Piece);
const pageViewService = require('../services/page-view.service');
const emailService = require('../services/email.service');
const { getFrontendUrl } = require('../utils/frontend-url');
const logger = require('../config/logger');

/**
 * @description Create a new global piece.
 * This piece is not associated with any choir yet. It's added to the master list.
 * It's expected that another action (like adding to a collection or repertoire)
 * will link this piece to a choir.
 */
exports.create = async (req, res) => {
    const {
        title,
        subtitle,
        composerCollection,
        composerId,
        origin,
        categoryId,
        voicing,
        key,
        timeSignature,
        durationSec,
        lyrics,
        imageIdentifier,
        license,
        opus,
        lyricsSource,
        authorName,
        authorId,
        arrangerIds,
        links,
        composers
    } = req.body;

    const { mainComposerId, error } = pieceService.validatePieceData({
        title,
        composerId,
        composers,
        origin
    });
    if (error) return res.status(400).send({ message: error });

    const resolvedAuthorId = await pieceService.resolveAuthor(authorId, authorName);

    const newPiece = await base.service.create({
        title,
        subtitle,
        composerCollection,
        composerId: mainComposerId || null,
        categoryId,
        voicing,
        key,
        timeSignature,
        durationSec,
        lyrics,
        imageIdentifier,
        license,
        opus,
        lyricsSource,
        origin,
        authorId: resolvedAuthorId
    });

    await pieceService.assignArrangers(newPiece, arrangerIds);
    await pieceService.assignComposers(newPiece.id, composers, mainComposerId);
    await pieceService.createLinks(newPiece.id, links);

    const result = await db.piece.findByPk(newPiece.id, {
        include: [
            { model: Composer, as: 'composers', through: { attributes: ['type'] } },
            { model: Composer, as: 'composer', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Author, as: 'author', attributes: ['id', 'name'] },
            { model: db.piece_link, as: 'links', include: [{ model: db.audio_marker, as: 'markers' }] }
        ]
    });

    res.status(201).send(result);
};


/**
 * @description Find all global pieces.
 * This is useful for administrative tasks or for populating a lookup/autocomplete
 * when adding pieces to a collection.
 */
exports.findAll = async (req, res) => {
    const { composerId, authorId, license } = req.query;
    const where = {};
    if (composerId) where.composerId = composerId;
    if (authorId) where.authorId = authorId;
    if (license) {
        const licenses = Array.isArray(license) ? license : String(license).split(',');
        where.license = { [Op.in]: licenses };
    }

    const pieces = await base.service.findAll({
            where,
            attributes: {
                include: [
                    [db.sequelize.literal(`(SELECT COUNT(*) FROM "collection_pieces" AS "cp" WHERE "cp"."pieceId" = "piece"."id")`), 'collectionCount']
                ]
            },
            include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Composer, as: 'composers', through: { attributes: ['type'] } },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] },
                { model: db.piece_link, as: 'links', include: [{ model: db.audio_marker, as: 'markers' }] }
            ],
            order: [['title', 'ASC']]
        });
    res.status(200).send(pieces);
};


/**
 * @description Find a single global piece by its ID.
 */
exports.findOne = async (req, res) => {
    const id = req.params.id;

    const piece = await base.service.findById(id, {
        include: [
                { model: Composer, as: 'composer', attributes: ['id', 'name'] },
                { model: Composer, as: 'composers', through: { attributes: ['type'] } },
                { model: Category, as: 'category', attributes: ['id', 'name'] },
                { model: Author, as: 'author', attributes: ['id', 'name'] },
                { model: db.piece_link, as: 'links', include: [{ model: db.audio_marker, as: 'markers' }] }
            ]
        });

    if (piece) {
        res.status(200).send(piece);
    } else {
        res.status(404).send({
            message: `Cannot find Piece with id=${id}.`
        });
    }
};


/**
 * @description Update a global piece's details.
 * This would typically be an administrative function.
 */
exports.update = async (req, res) => {
    const id = req.params.id;

    const nonAdmin = !req.userRoles.includes('admin');
    const allowedNonAdminFields = ['durationSec'];
    if (nonAdmin) {
        const keys = Object.keys(req.body || {});
        const hasOnlyAllowed = keys.length > 0 && keys.every(k => allowedNonAdminFields.includes(k));
        if (!hasOnlyAllowed) {
            await db.piece_change.create({ pieceId: id, userId: req.userId, data: req.body });
            const piece = await Piece.findByPk(id);
            const proposer = await db.user.findByPk(req.userId);
            const admins = (await db.user.findAll()).filter(u => Array.isArray(u.roles) && u.roles.includes('admin'));
            const linkBase = await getFrontendUrl();
            const link = `${linkBase}/admin/piece-changes`;
            await Promise.all(
                admins.filter(a => a.email).map(a =>
                    emailService.sendPieceChangeProposalMail(
                        a.email,
                        piece?.title || `Piece ${id}`,
                        proposer?.name || proposer?.email || 'Ein Benutzer',
                        link
                    )
                )
            );
            return res.status(202).send({ message: 'Change proposal created.' });
        }
    }

    const { links, composers, ...pieceData } = req.body;

    if (composers) {
        await db.piece_composer.destroy({ where: { pieceId: id } });
        if (composers.length > 0) {
            await db.piece_composer.bulkCreate(
                composers.map(c => ({ pieceId: id, composerId: c.id, type: c.type }))
            );
            if (!pieceData.composerId) pieceData.composerId = composers[0].id;
        }
    }

    const num = await base.service.update(id, pieceData);

    if (links) {
        await db.piece_link.destroy({ where: { pieceId: id } });
        if (links.length > 0) {
            const linkObjects = links.map(link => ({ ...link, pieceId: id }));
            await db.piece_link.bulkCreate(linkObjects);
        }
    }

    if (num == 1) {
        res.send({ message: "Piece was updated successfully." });
    } else {
        res.send({ message: `Cannot update Piece with id=${id}. Maybe Piece was not found or req.body is empty!` });
    }
};


/**
 * @description Delete a global piece.
 * This is a destructive action and should be used with care, likely only by an admin.
 * Checks if piece is referenced in any collections before allowing deletion.
 */
exports.delete = asyncHandler(async (req, res) => {
    const pieceId = req.params.id;
    const userId = req.userId;
    const choirId = req.query.choirId; // Admin context

    logger.debug(`Delete request for piece ${pieceId} by user ${userId}`);

    // Validate piece can be deleted (not in any collections)
    const validation = await mergeService.validatePieceDelete(pieceId);

    if (!validation.canDelete) {
        logger.warn(`Cannot delete piece ${pieceId}: it's in ${validation.affectedCollections.length} collections`);
        return res.status(409).send({
            message: 'Piece cannot be deleted because it is referenced in collections',
            affectedCollections: validation.affectedCollections,
            code: 'PIECE_IN_COLLECTIONS'
        });
    }

    // Delete with audit log
    const result = await mergeService.deletePieceWithAudit(pieceId, userId, choirId);

    res.status(200).send({
        message: result.message,
        pieceId: result.pieceId
    });
});

exports.report = async (req, res) => {
    const { id } = req.params;
    const { category, reason } = req.body || {};
    if (!reason) {
        return res.status(400).send({ message: 'reason is required' });
    }
    try {
        const piece = await Piece.findByPk(id);
        if (!piece) return res.status(404).send({ message: 'Piece not found.' });
        const reporter = await db.user.findByPk(req.userId);
        const admins = (await db.user.findAll()).filter(u => Array.isArray(u.roles) && u.roles.includes('admin'));
        const recipients = admins.filter(a => a.email).map(a => a.email);
        const linkBase = await getFrontendUrl();
        const link = `${linkBase}/pieces/${id}`;
        await emailService.sendPieceReportMail(
            recipients,
            piece.title || `Piece ${id}`,
            reporter?.name || reporter?.email || 'Ein Benutzer',
            category || 'Sonstiges',
            reason,
            link
        );
        res.status(200).send({ message: 'Report sent' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// eslint-disable-next-line no-unused-vars
exports.uploadImage = async (req, res, next) => {
    const id = req.params.id;
    if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });

    const piece = await Piece.findByPk(id);
    if (!piece) return res.status(404).send({ message: 'Piece not found.' });

    await piece.update({ imageIdentifier: req.file.filename });
    res.status(200).send({ filename: req.file.filename });
};

// eslint-disable-next-line no-unused-vars
exports.uploadLinkFile = async (req, res, next) => {
    if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });
    res.status(200).send({ path: `/uploads/piece-files/${req.file.filename}` });
};

// eslint-disable-next-line no-unused-vars
exports.deleteLinkFile = async (req, res, next) => {
    const { path: filePath } = req.body || {};
    if (!filePath) return res.status(400).send({ message: 'No file path provided.' });

    const filename = path.basename(filePath);
    const result = await fileService.deleteFile('files', filename);
    if (result.notFound) return res.status(404).send({ message: 'File not found.' });
    if (result.inUse) return res.status(400).send({ message: 'File in use.' });
    return res.status(200).send({ message: 'File deleted.' });
};

// eslint-disable-next-line no-unused-vars
exports.getImage = async (req, res, next) => {
    const id = req.params.id;
    const piece = await Piece.findByPk(id);

        if (!piece || !piece.imageIdentifier) {
            return res.status(200).json({ data: '' });
        }

    const filePath = path.join(__dirname, '../../uploads/piece-images', piece.imageIdentifier);

    try {
        await fs.access(filePath);
    } catch (err) {
        return res.status(200).json({ data: '' });
    }

    const fileData = await fs.readFile(filePath);
    const base64 = fileData.toString('base64');
    const SAFE_IMAGE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mimeType = SAFE_IMAGE_MIME[ext] ?? 'image/jpeg';
    res.status(200).json({ data: `data:${mimeType};base64,${base64}` });
};

/**
 * @description Generate or retrieve a share token for a piece
 * If a token already exists, return it. Otherwise, generate a new one.
 */
exports.generateShareToken = async (req, res) => {
    const id = req.params.id;

    const piece = await Piece.findByPk(id);
    if (!piece) {
        return res.status(404).send({ message: 'Piece not found.' });
    }

    // If token already exists, return it
    if (piece.shareToken) {
        return res.status(200).send({ shareToken: piece.shareToken });
    }

    // Generate a new unique token
    let shareToken;
    let isUnique = false;

    while (!isUnique) {
        shareToken = crypto.randomBytes(16).toString('hex');
        const existing = await Piece.findOne({ where: { shareToken } });
        if (!existing) {
            isUnique = true;
        }
    }

    await piece.update({ shareToken });
    res.status(200).send({ shareToken });
};

/**
 * @description Get piece details by share token (public endpoint)
 * Returns piece information including composers, category, author, and links
 */
exports.getByShareToken = async (req, res) => {
    const { token } = req.params;

    const piece = await Piece.findOne({
        where: { shareToken: token },
        include: [
            { model: Composer, as: 'composers', through: { attributes: ['type'] } },
            { model: Composer, as: 'composer', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Author, as: 'author', attributes: ['id', 'name'] },
            { model: db.piece_link, as: 'links', include: [{ model: db.audio_marker, as: 'markers' }] }
        ]
    });

    if (!piece) {
        return res.status(404).send({ message: 'Piece not found with this share token.' });
    }

    // Track shared piece view (fire-and-forget)
    pageViewService.trackPageView({
        path: `/shared-piece/${token}`,
        category: 'shared-piece',
        entityId: piece.id,
        entityLabel: piece.title || piece.name || null,
        shareToken: token,
        userId: null,
        choirId: null,
        req
    });

    res.status(200).send(piece);
};

/**
 * @description Serve a raw piece image file (for OG meta tags / social previews).
 * Unlike getImage which returns base64 JSON, this returns the actual image file.
 */
exports.getImageRaw = async (req, res) => {
    const id = req.params.id;
    const piece = await Piece.findByPk(id);

    if (!piece || !piece.imageIdentifier) {
        return res.status(404).send();
    }

    const filePath = path.join(__dirname, '../../uploads/piece-images', piece.imageIdentifier);

    try {
        await fs.access(filePath);
    } catch (err) {
        return res.status(404).send();
    }

    const ext = path.extname(filePath).slice(1) || 'jpeg';
    const mimeType = 'image/' + ext;
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400');
    const fileData = await fs.readFile(filePath);
    res.send(fileData);
};

/**
 * @description Serve an HTML page with Open Graph meta tags for a shared piece.
 * Used by social media crawlers (WhatsApp, Facebook, Telegram, etc.) to generate
 * rich link previews with title, composer, category and sheet music image.
 */
exports.getShareOgPage = async (req, res) => {
    const { token } = req.params;

    const piece = await Piece.findOne({
        where: { shareToken: token },
        include: [
            { model: Composer, as: 'composer', attributes: ['id', 'name'] },
            { model: Category, as: 'category', attributes: ['id', 'name'] },
        ]
    });

    if (!piece) {
        return res.status(404).send('<html><body><h1>Stück nicht gefunden</h1></body></html>');
    }

    const frontendUrl = await getFrontendUrl();
    const canonicalUrl = `${frontendUrl}/shared-piece/${token}`;

    const title = piece.title || 'Geteiltes Stück';
    const composerName = piece.composer?.name || piece.origin || '';
    const categoryName = piece.category?.name || '';
    const subtitle = piece.subtitle || '';

    // Build description from available metadata
    const descParts = [];
    if (composerName) descParts.push(composerName);
    if (categoryName) descParts.push(categoryName);
    if (piece.voicing) descParts.push(`Besetzung: ${piece.voicing}`);
    if (piece.key) descParts.push(`Tonart: ${piece.key}`);
    const description = descParts.length > 0
        ? descParts.join(' · ')
        : 'Ein Stück aus der NAK Chorleiter Repertoire-Verwaltung';

    // Use raw image endpoint if piece has an image, otherwise use the app icon
    const ogImage = piece.imageIdentifier
        ? `${frontendUrl}/api/pieces/${piece.id}/image/raw`
        : `${frontendUrl}/assets/icons/icon-512x512.png`;

    // Escape HTML entities to prevent XSS
    const esc = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}${subtitle ? ' – ' + esc(subtitle) : ''} - NAK Chorleiter</title>
  <link rel="canonical" href="${esc(canonicalUrl)}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="NAK Chorleiter">
  <meta property="og:title" content="${esc(title)}${subtitle ? ' – ' + esc(subtitle) : ''}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonicalUrl)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:alt" content="${piece.imageIdentifier ? esc(title + ' – Notenbild') : 'NAK Chorleiter'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${piece.imageIdentifier ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(ogImage)}">

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${esc(canonicalUrl)}">
</head>
<body>
  <p>Weiterleitung zu <a href="${esc(canonicalUrl)}">${esc(title)} – NAK Chorleiter</a>...</p>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(html);
};
